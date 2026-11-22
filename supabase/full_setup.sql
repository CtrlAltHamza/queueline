-- ==============================================================================
-- QUEUELINE: COMPLETE DATABASE SCHEMA + SEED DATA SETUP
-- Run this entire script in Supabase SQL Editor
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'salon' NOT NULL,
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,
    deposit_cents INTEGER DEFAULT 2500 NOT NULL,
    currency TEXT DEFAULT 'usd' NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Memberships Table (Owners and Staff)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
    display_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (business_id, user_id)
);

-- 5. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_min INTEGER NOT NULL CHECK (duration_min > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Business Hours Table
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    opens TIME NOT NULL,
    closes TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT valid_hours CHECK (opens < closes OR is_closed = TRUE),
    UNIQUE (business_id, weekday)
);

-- 7. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'no_show', 'completed')),
    deposit_amount_cents INTEGER DEFAULT 0 NOT NULL,
    stripe_session_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_booking_interval CHECK (starts_at < ends_at)
);

-- Double-booking prevention via Postgres exclusion constraint on active bookings per business
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_staff_bookings;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
        business_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'no_show'));

-- Public RPC function to get busy slot intervals (safe for anonymous / customer callers)
CREATE OR REPLACE FUNCTION public.get_busy_slots(p_business_id UUID)
RETURNS TABLE (starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.starts_at, b.ends_at
  FROM public.bookings b
  WHERE b.business_id = p_business_id
    AND b.status NOT IN ('cancelled', 'no_show');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID) TO anon, authenticated, service_role;

-- Automatic Profile Creation on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.profiles.name),
      updated_at = NOW();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Queue Entries Table (Walk-in Live Queue)
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    ticket_no TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'called', 'served', 'no_show', 'left')),
    estimated_wait_min INTEGER DEFAULT 15 NOT NULL,
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Stripe Webhook Events Table (Idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON public.bookings(business_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_queue_business_status ON public.queue_entries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);

-- 11. Security Definer Role Checker Function
CREATE OR REPLACE FUNCTION public.has_role(
    target_business_id UUID,
    allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE business_id = target_business_id
          AND user_id = auth.uid()
          AND role = ANY(allowed_roles)
    );
$$;

-- 12. Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies (Safe drop & create)
DROP POLICY IF EXISTS "Public profiles can be viewed by anyone" ON public.profiles;
CREATE POLICY "Public profiles can be viewed by anyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;
CREATE POLICY "Anyone can view active businesses" ON public.businesses FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view business hours" ON public.business_hours;
CREATE POLICY "Anyone can view business hours" ON public.business_hours FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view business active queue" ON public.queue_entries;
CREATE POLICY "Anyone can view business active queue" ON public.queue_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

DROP POLICY IF EXISTS "Staff and owners can view business bookings" ON public.bookings;
CREATE POLICY "Staff and owners can view business bookings" ON public.bookings FOR SELECT USING (public.has_role(business_id, ARRAY['owner', 'staff']));

DROP POLICY IF EXISTS "Staff and owners can manage bookings" ON public.bookings;
CREATE POLICY "Staff and owners can manage bookings" ON public.bookings FOR ALL USING (public.has_role(business_id, ARRAY['owner', 'staff']));

DROP POLICY IF EXISTS "Customers can join queue" ON public.queue_entries;
CREATE POLICY "Customers can join queue" ON public.queue_entries FOR INSERT WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

DROP POLICY IF EXISTS "Staff and owners can manage queue entries" ON public.queue_entries;
CREATE POLICY "Staff and owners can manage queue entries" ON public.queue_entries FOR ALL USING (public.has_role(business_id, ARRAY['owner', 'staff']));

DROP POLICY IF EXISTS "Service role only for stripe events" ON public.stripe_events;
CREATE POLICY "Service role only for stripe events" ON public.stripe_events FOR ALL USING (false);

-- ==============================================================================
-- 14. SEED DATA (Demo Clinics, Services, Hours, Sample Queue)
-- ==============================================================================

-- Demo Businesses
INSERT INTO public.businesses (id, slug, name, description, category, timezone, deposit_cents, currency, address, phone)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'glow-clinic',
    'Glow Aesthetic Clinic & Wellness',
    'Premier medical spa offering advanced laser treatments, skincare, and restorative wellness therapies.',
    'clinic',
    'America/New_York',
    3000,
    'usd',
    '450 Lexington Ave, Suite 400, New York, NY 10017',
    '+1 (212) 555-0199'
),
(
    '22222222-2222-2222-2222-222222222222',
    'urban-blade',
    'Urban Blade Barber & Grooming Lounge',
    'Modern gentleman barber studio specializing in precision haircuts, hot towel shaves, and beard craft.',
    'salon',
    'America/New_York',
    1500,
    'usd',
    '128 Bedford Ave, Brooklyn, NY 11249',
    '+1 (718) 555-0144'
)
ON CONFLICT (id) DO NOTHING;

-- Services for Glow Clinic
INSERT INTO public.services (id, business_id, name, description, duration_min, price_cents)
VALUES
('33333333-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HydraFacial Deluxe', 'Deep pore cleansing, exfoliation, hydration, and LED light therapy.', 45, 17500),
('33333333-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Microneedling Collagen Boost', 'Collagen induction therapy for skin tightening and smoothing.', 60, 25000),
('33333333-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Laser Hair Removal - Underarms', 'Targeted diode laser therapy for permanent hair reduction.', 30, 9500),
('33333333-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Chemical Peel Glow Treatment', 'Gentle exfoliating peel for tone, clarity, and radiance.', 40, 14000)
ON CONFLICT (id) DO NOTHING;

-- Services for Urban Blade
INSERT INTO public.services (id, business_id, name, description, duration_min, price_cents)
VALUES
('33333333-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Signature Fade & Scissor Cut', 'Custom precision haircut including neck shave and styling.', 35, 4500),
('33333333-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Traditional Hot Towel Shave', 'Aromatherapy steam, pre-shave oil, hot lathers, and straight razor.', 40, 5000),
('33333333-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'The Full Package (Hair + Beard)', 'Complete haircut, beard trim, shaping, razor line-up and scalp massage.', 60, 8500)
ON CONFLICT (id) DO NOTHING;

-- Business Hours
INSERT INTO public.business_hours (business_id, weekday, opens, closes, is_closed)
VALUES
('11111111-1111-1111-1111-111111111111', 0, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 1, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 2, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 3, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 4, '09:00', '18:00', false),
('11111111-1111-1111-1111-111111111111', 5, '09:00', '19:00', false),
('11111111-1111-1111-1111-111111111111', 6, '10:00', '17:00', false),

('22222222-2222-2222-2222-222222222222', 0, '10:00', '16:00', false),
('22222222-2222-2222-2222-222222222222', 1, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 2, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 3, '09:00', '19:00', false),
('22222222-2222-2222-2222-222222222222', 4, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 5, '09:00', '20:00', false),
('22222222-2222-2222-2222-222222222222', 6, '09:00', '18:00', false)
ON CONFLICT (business_id, weekday) DO NOTHING;

-- Sample Live Queue Entries
INSERT INTO public.queue_entries (id, business_id, customer_name, customer_phone, ticket_no, status, estimated_wait_min)
VALUES
('55555555-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'Sarah Jenkins', '+1 (555) 234-5678', 'A012', 'served', 0),
('55555555-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'David Ross', '+1 (555) 345-6789', 'A013', 'called', 0),
('55555555-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'Emma Watson', '+1 (555) 456-7890', 'A014', 'waiting', 15),
('55555555-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'Michael Chang', '+1 (555) 567-8901', 'A015', 'waiting', 30)
ON CONFLICT (id) DO NOTHING;
