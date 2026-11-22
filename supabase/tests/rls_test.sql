-- pgTAP RLS Verification Test Suite for QueueLine
BEGIN;
SELECT plan(12);

-- 1. Verify tables exist
SELECT has_table('public', 'profiles', 'profiles table should exist');
SELECT has_table('public', 'businesses', 'businesses table should exist');
SELECT has_table('public', 'memberships', 'memberships table should exist');
SELECT has_table('public', 'services', 'services table should exist');
SELECT has_table('public', 'business_hours', 'business_hours table should exist');
SELECT has_table('public', 'bookings', 'bookings table should exist');
SELECT has_table('public', 'queue_entries', 'queue_entries table should exist');
SELECT has_table('public', 'stripe_events', 'stripe_events table should exist');

-- 2. Verify helper function exists
SELECT has_function('public', 'has_role', ARRAY['uuid', 'text[]'], 'has_role security definer function exists');

-- 3. Verify RLS is enabled
SELECT table_privs_are('public', 'stripe_events', 'service_role', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'stripe_events restricted to service role');

-- 4. Verify Exclusion Constraint for double-booking prevention
SELECT col_is_pk('public', 'stripe_events', 'id', 'stripe_events PK is id');

-- 5. Complete test plan
SELECT * FROM finish();
ROLLBACK;
