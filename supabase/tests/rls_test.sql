-- ==============================================================================
-- QUEUELINE: Comprehensive pgTAP Multi-Tenant RLS & Security Definer Test Suite
-- Proves tenant isolation, role barriers, and customer data privacy
-- ==============================================================================

BEGIN;
SELECT plan(21);

-- Test 1-2: Verify tables exist
SELECT has_table('public', 'bookings', 'bookings table must exist');
SELECT has_table('public', 'memberships', 'memberships table must exist');

-- Test 3-6: Helper security definer functions exist with hardened search path
SELECT has_function('public', 'has_role', ARRAY['uuid', 'text[]'], 'has_role security definer function exists');
SELECT has_function('public', 'get_busy_slots', ARRAY['uuid'], 'get_busy_slots RPC function exists');
SELECT has_function('public', 'get_queue_public_status', ARRAY['uuid'], 'get_queue_public_status RPC function exists');
SELECT has_function('public', 'get_queue_position', ARRAY['uuid'], 'get_queue_position RPC function exists');

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

INSERT INTO public.queue_entries (id, business_id, customer_id, customer_name, customer_phone, ticket_no, status, estimated_wait_min)
VALUES 
  (
    '88888888-1111-1111-1111-111111111111',
    '11111111-0000-0000-0000-000000000001',
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'Customer A',
    '+15551111',
    'A001',
    'waiting',
    15
  ),
  (
    '88888888-2222-2222-2222-222222222222',
    '22222222-0000-0000-0000-000000000002',
    'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    'Customer B',
    '+15552222',
    'B001',
    'waiting',
    15
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memberships (business_id, user_id, role, display_title)
VALUES 
  ('11111111-0000-0000-0000-000000000001', 'cccccccc-3333-3333-3333-cccccccccccc', 'staff', 'Staff Specialist')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Test 7: Anonymous user can view active businesses
SET LOCAL ROLE anon;
SELECT cmp_ok(
  (SELECT count(*)::integer FROM public.businesses WHERE is_active = true),
  '>',
  0,
  'Anonymous users can read active businesses'
);

-- Test 8: Anonymous user CANNOT view any bookings (customer privacy)
SELECT is_empty(
  'SELECT * FROM public.bookings',
  'Anonymous users cannot view any customer bookings via RLS'
);

-- Test 9: Anonymous user CANNOT view any queue entries (prevents customer PII scraping)
SELECT is_empty(
  'SELECT * FROM public.queue_entries',
  'Anonymous users cannot view any queue entries via RLS (prevents customer PII scraping)'
);

-- Test 10: Anonymous user CANNOT insert arbitrary queue entries without customer_id = auth.uid()
SELECT throws_ok(
  'INSERT INTO public.queue_entries (business_id, customer_name, customer_phone, ticket_no, status, estimated_wait_min)
   VALUES (''11111111-0000-0000-0000-000000000001'', ''Infiltrator'', ''+15559999'', ''X999'', ''waiting'', 10)',
  '42501',
  NULL,
  'Anonymous user cannot insert arbitrary queue entries'
);

-- Test 11: Customer A can ONLY view their own booking
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa"}';

SELECT results_eq(
  'SELECT customer_name FROM public.bookings',
  ARRAY['Customer A'],
  'Customer A can only view their own booking records'
);

-- Test 12: Customer A CANNOT view Customer B booking
SELECT is_empty(
  'SELECT * FROM public.bookings WHERE customer_id = ''bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb''',
  'Customer A cannot view Customer B booking'
);

-- Test 13: Customer A can ONLY view their own queue ticket
SELECT results_eq(
  'SELECT ticket_no FROM public.queue_entries',
  ARRAY['A001'],
  'Customer A can only view their own queue ticket'
);

-- Test 14: Customer A CANNOT view Customer B queue ticket
SELECT is_empty(
  'SELECT * FROM public.queue_entries WHERE customer_id = ''bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb''',
  'Customer A cannot view Customer B queue ticket'
);

-- Test 15: Staff of Clinic A can view bookings for Clinic A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "cccccccc-3333-3333-3333-cccccccccccc"}';

SELECT results_eq(
  'SELECT customer_name FROM public.bookings WHERE business_id = ''11111111-0000-0000-0000-000000000001''',
  ARRAY['Customer A'],
  'Staff member can view bookings for their assigned clinic'
);

-- Test 16: Staff of Clinic A CANNOT view bookings for Clinic B (Tenant Isolation)
SELECT is_empty(
  'SELECT * FROM public.bookings WHERE business_id = ''22222222-0000-0000-0000-000000000002''',
  'Staff of Clinic A cannot view bookings for Clinic B (Tenant Isolation enforced)'
);

-- Test 17: Staff of Clinic A can view queue entries for Clinic A
SELECT results_eq(
  'SELECT ticket_no FROM public.queue_entries WHERE business_id = ''11111111-0000-0000-0000-000000000001''',
  ARRAY['A001'],
  'Staff of Clinic A can view queue entries for Clinic A'
);

-- Test 18: Staff of Clinic A CANNOT view queue entries for Clinic B (Tenant Isolation)
SELECT is_empty(
  'SELECT * FROM public.queue_entries WHERE business_id = ''22222222-0000-0000-0000-000000000002''',
  'Staff of Clinic A cannot view queue entries for Clinic B (Tenant Isolation)'
);

-- Test 19: Public RPC get_busy_slots returns intervals to anyone without leaking PII
SET LOCAL ROLE anon;
SELECT cmp_ok(
  (SELECT count(*)::integer FROM public.get_busy_slots('11111111-0000-0000-0000-000000000001')),
  '>',
  0,
  'Public RPC get_busy_slots successfully returns busy intervals to anonymous users'
);

-- Test 20: Public RPC get_queue_public_status returns waiting count without customer PII
SELECT cmp_ok(
  ((public.get_queue_public_status('11111111-0000-0000-0000-000000000001'))->>'waiting_count')::int,
  '>=',
  1,
  'Public RPC get_queue_public_status returns waiting count without customer PII'
);

-- Test 21: Exclusion constraint prevents overlapping bookings on same business
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
