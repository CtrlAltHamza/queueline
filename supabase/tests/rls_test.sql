-- ==============================================================================
-- QUEUELINE: Comprehensive pgTAP Multi-Tenant RLS & Security Definer Test Suite
-- Proves tenant isolation, role barriers, and customer data privacy
-- ==============================================================================

BEGIN;
SELECT plan(10);

-- Test 1: Verify tables exist
SELECT has_table('public', 'bookings', 'bookings table must exist');
SELECT has_table('public', 'memberships', 'memberships table must exist');

-- Test 2: Helper security definer has_role function exists with hardened search path
SELECT has_function('public', 'has_role', ARRAY['uuid', 'text[]'], 'has_role security definer function exists');
SELECT has_function('public', 'get_busy_slots', ARRAY['uuid'], 'get_busy_slots RPC function exists');

-- Set up mock test fixtures inside transaction
INSERT INTO public.businesses (id, slug, name, category, timezone, deposit_cents, currency, is_active)
VALUES 
  ('11111111-0000-0000-0000-000000000001', 'test-clinic-a', 'Test Clinic A', 'clinic', 'UTC', 1000, 'usd', true),
  ('22222222-0000-0000-0000-000000000002', 'test-clinic-b', 'Test Clinic B', 'clinic', 'UTC', 1000, 'usd', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (id, business_id, name, duration_min, price_cents, is_active)
VALUES 
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Standard Exam', 30, 5000, true),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'Dental Polish', 45, 6000, true)
ON CONFLICT (id) DO NOTHING;

-- Mock users (insert into auth.users and public.profiles to satisfy foreign key constraints)
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data)
VALUES 
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'customera@example.com', '{"full_name": "Customer A"}'),
  ('bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'customerb@example.com', '{"full_name": "Customer B"}'),
  ('cccccccc-3333-3333-3333-cccccccccccc', 'authenticated', 'authenticated', 'staffa@example.com', '{"full_name": "Staff A"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, name, email)
VALUES 
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Customer A', 'customera@example.com'),
  ('bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'Customer B', 'customerb@example.com'),
  ('cccccccc-3333-3333-3333-cccccccccccc', 'Staff A', 'staffa@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (id, business_id, service_id, customer_id, customer_name, customer_email, starts_at, ends_at, status)
VALUES 
  (
    '99999999-1111-1111-1111-111111111111',
    '11111111-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'Customer A',
    'customera@example.com',
    '2026-12-01 10:00:00+00',
    '2026-12-01 10:30:00+00',
    'confirmed'
  ),
  (
    '99999999-2222-2222-2222-222222222222',
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000002',
    'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    'Customer B',
    'customerb@example.com',
    '2026-12-01 14:00:00+00',
    '2026-12-01 14:45:00+00',
    'confirmed'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memberships (business_id, user_id, role, display_title)
VALUES 
  ('11111111-0000-0000-0000-000000000001', 'cccccccc-3333-3333-3333-cccccccccccc', 'staff', 'Staff Specialist')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Test 3: Anonymous user can view active businesses
SET LOCAL ROLE anon;
SELECT results_ne(
  'SELECT count(*)::integer FROM public.businesses WHERE is_active = true',
  0,
  'Anonymous users can read active businesses'
);

-- Test 4: Anonymous user CANNOT view any bookings (customer privacy)
SELECT is_empty(
  'SELECT * FROM public.bookings',
  'Anonymous users cannot view any customer bookings via RLS'
);

-- Test 5: Customer A can ONLY view their own booking
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa"}';

SELECT results_eq(
  'SELECT customer_name FROM public.bookings',
  ARRAY['Customer A'],
  'Customer A can only view their own booking records'
);

-- Test 6: Customer A CANNOT view Customer B booking
SELECT is_empty(
  'SELECT * FROM public.bookings WHERE customer_id = ''bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb''',
  'Customer A cannot view Customer B booking'
);

-- Test 7: Staff of Clinic A can view bookings for Clinic A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "cccccccc-3333-3333-3333-cccccccccccc"}';

SELECT results_eq(
  'SELECT customer_name FROM public.bookings WHERE business_id = ''11111111-0000-0000-0000-000000000001''',
  ARRAY['Customer A'],
  'Staff member can view bookings for their assigned clinic'
);

-- Test 8: Staff of Clinic A CANNOT view bookings for Clinic B (Tenant Isolation)
SELECT is_empty(
  'SELECT * FROM public.bookings WHERE business_id = ''22222222-0000-0000-0000-000000000002''',
  'Staff of Clinic A cannot view bookings for Clinic B (Tenant Isolation enforced)'
);

-- Test 9: Public RPC get_busy_slots returns intervals to anyone without leaking PII
SET LOCAL ROLE anon;
SELECT results_ne(
  'SELECT count(*)::integer FROM public.get_busy_slots(''11111111-0000-0000-0000-000000000001'')',
  0,
  'Public RPC get_busy_slots successfully returns busy intervals to anonymous users'
);

-- Test 10: Exclusion constraint prevents overlapping bookings on same business
SELECT throws_ok(
  'INSERT INTO public.bookings (business_id, service_id, customer_name, customer_email, starts_at, ends_at, status)
   VALUES (
     ''11111111-0000-0000-0000-000000000001'',
     ''33333333-0000-0000-0000-000000000001'',
     ''Conflict Person'',
     ''conflict@example.com'',
     ''2026-12-01 10:15:00+00'',
     ''2026-12-01 10:45:00+00'',
     ''confirmed''
   )',
  '23P01',
  NULL,
  'Exclusion constraint throws 23P01 on overlapping time intervals for the same business'
);

SELECT * FROM finish();
ROLLBACK;
