-- ==============================================================================
-- QUEUELINE MIGRATION: Fix Double-Booking Constraint, Busy Slots RPC & Auth Trigger
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xutwgyabpvaybujukiuv/sql
-- ==============================================================================

-- 1. Update exclusion constraint to business level (prevents double bookings even if staff_id is null)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_staff_bookings;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
        business_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'no_show'));

-- 2. Public RPC function to get busy slot intervals (safe for anonymous / customer callers)
CREATE OR REPLACE FUNCTION public.get_busy_slots(p_business_id UUID)
RETURNS TABLE (starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT b.starts_at, b.ends_at
  FROM public.bookings b
  WHERE b.business_id = p_business_id
    AND b.status NOT IN ('cancelled', 'no_show');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(UUID) TO anon, authenticated, service_role;

-- 3. Automatic Profile Creation on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
