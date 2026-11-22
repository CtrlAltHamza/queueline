-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'salon' NOT NULL, -- 'clinic', 'salon', etc.
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,
    deposit_cents INTEGER DEFAULT 2500 NOT NULL, -- e.g. $25.00 deposit required
    currency TEXT DEFAULT 'usd' NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Memberships table (Owners and Staff)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
    display_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (business_id, user_id)
);

-- Services table
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

-- Business hours table (weekday: 0 = Sunday, 1 = Monday, ..., 6 = Saturday)
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

-- Bookings table
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

-- Double-booking prevention via Postgres exclusion constraint on staff active bookings
-- (Requires btree_gist extension)
-- Only enforce for non-cancelled / non-no-show bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_staff_bookings;
ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_staff_bookings
    EXCLUDE USING gist (
        staff_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'no_show'));

-- Queue Entries table (Walk-in Live Queue)
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    ticket_no TEXT NOT NULL, -- e.g. "A014"
    status TEXT NOT NULL CHECK (status IN ('waiting', 'called', 'served', 'no_show', 'left')),
    estimated_wait_min INTEGER DEFAULT 15 NOT NULL,
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Stripe Webhook Events table (Idempotency storage)
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id TEXT PRIMARY KEY, -- Stripe event ID (e.g. evt_123456789)
    event_type TEXT NOT NULL,
    data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON public.bookings(business_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_queue_business_status ON public.queue_entries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);

-- RLS Security Definer Role Checker
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

-- Enable Row-Level Security on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Public profiles can be viewed by anyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can edit own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Businesses RLS (Anonymous users can view active businesses)
CREATE POLICY "Anyone can view active businesses" ON public.businesses
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can update their business" ON public.businesses
    FOR UPDATE USING (public.has_role(id, ARRAY['owner']));

-- 3. Memberships RLS
CREATE POLICY "Members can view memberships in their business" ON public.memberships
    FOR SELECT USING (public.has_role(business_id, ARRAY['owner', 'staff']));

CREATE POLICY "Owners can manage memberships" ON public.memberships
    FOR ALL USING (public.has_role(business_id, ARRAY['owner']));

-- 4. Services RLS (Anonymous users can view services)
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage services" ON public.services
    FOR ALL USING (public.has_role(business_id, ARRAY['owner']));

-- 5. Business Hours RLS (Anonymous users can view hours)
CREATE POLICY "Anyone can view business hours" ON public.business_hours
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage business hours" ON public.business_hours
    FOR ALL USING (public.has_role(business_id, ARRAY['owner']));

-- 6. Bookings RLS
CREATE POLICY "Customers can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff and owners can view business bookings" ON public.bookings
    FOR SELECT USING (public.has_role(business_id, ARRAY['owner', 'staff']));

CREATE POLICY "Customers can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Customers can cancel own booking" ON public.bookings
    FOR UPDATE USING (auth.uid() = customer_id)
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Staff and owners can manage bookings" ON public.bookings
    FOR ALL USING (public.has_role(business_id, ARRAY['owner', 'staff']));

-- 7. Queue Entries RLS
CREATE POLICY "Anyone can view business active queue" ON public.queue_entries
    FOR SELECT USING (true);

CREATE POLICY "Customers can join queue" ON public.queue_entries
    FOR INSERT WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

CREATE POLICY "Customers can update own ticket (leave)" ON public.queue_entries
    FOR UPDATE USING (auth.uid() = customer_id)
    WITH CHECK (status = 'left');

CREATE POLICY "Staff and owners can manage queue entries" ON public.queue_entries
    FOR ALL USING (public.has_role(business_id, ARRAY['owner', 'staff']));

-- 8. Stripe Events RLS (Strictly service role backend access only)
CREATE POLICY "Service role only for stripe events" ON public.stripe_events
    FOR ALL USING (false);
