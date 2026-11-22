# T2: Schema Migrations, Seed Data, Generated Types

**Goal:** Create Postgres schema migrations with tables, constraints, foreign keys, indexes, and comprehensive seed data for clinic & salon businesses.

**Done when:**
- [x] Migrations include `profiles`, `businesses`, `memberships`, `services`, `business_hours`, `bookings`, `queue_entries`, `stripe_events`
- [x] PostgreSQL exclusion constraint on `(staff_id, tstzrange(starts_at, ends_at))` prevents overlapping bookings
- [x] Idempotent stripe webhook tracking table with primary key `event_id`
- [x] Seed data provides demo clinic ("Glow Clinic & Spa", slug: `glow-clinic`) and salon with realistic hours, staff, services, and upcoming bookings
- [x] TypeScript database definitions (`lib/supabase/database.types.ts`) generated matching schema

**Notes:**
- Exclusion constraint requires `CREATE EXTENSION IF NOT EXISTS btree_gist;`
- Exclude cancelled bookings from the exclusion constraint so cancelled slots become bookable immediately.
