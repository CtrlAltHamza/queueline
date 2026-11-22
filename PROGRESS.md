# QueueLine Implementation Progress

Tracking implementation of all system deliverables and tickets.

| Ticket | Description | Status | Evidence / Artifact |
|---|---|---|---|
| **T1** | Project setup (Next.js 15, TypeScript, Tailwind, Docker, CI) | ✅ Completed | `package.json`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` |
| **T2** | Database schema, multi-tenant businesses, seed data | ✅ Completed | `supabase/full_setup.sql`, `supabase/migrations/` |
| **T3** | RLS tenant isolation & pgTAP test suite | ✅ Completed | `has_role()` security definer, `get_busy_slots` RPC, `supabase/tests/rls_test.sql` |
| **T4** | Auth, user sessions, Next.js route middleware | ✅ Completed | `middleware.ts`, `lib/supabase/server.ts`, protected `/owner` and `/staff` portals |
| **T5** | Public booking page with real business hours & dynamic slot picker | ✅ Completed | `app/(public)/b/[slug]/page.tsx`, `components/SlotPicker.tsx`, exclusion constraint on bookings |
| **T6** | Multi-channel payment strategy & hardened Stripe webhook | ✅ Completed | Pay on Arrival (primary) + Stripe test mode; atomic idempotency via `stripe_events` |
| **T7** | Transactional booking confirmation email | ✅ Completed | `lib/resend.ts`, HTML confirmation templates |
| **T8** | Customer appointments portal with authorized live cancellation | ✅ Completed | `app/(customer)/customer/bookings/page.tsx`, `app/api/bookings/cancel/route.ts` (customer/owner check) |
| **T9** | Realtime walk-in queue & ticket tracker | ✅ Completed | `app/(public)/b/[slug]/queue/page.tsx`, `app/queue/[id]/page.tsx`, sensory cues |
| **T10** | Staff operational schedule & authorized queue call-out board | ✅ Completed | `app/(staff)/staff/page.tsx`, `components/StaffQueueBoard.tsx`, `app/api/queue/call-next/route.ts` (has_role check) |
| **T11** | Owner dashboard, real-time metrics & service CRUD | ✅ Completed | `app/(owner)/owner/page.tsx`, `components/OwnerStatsCards.tsx`, `components/ServiceModal.tsx` |
| **T12** | Multi-country registration & PKR support | ✅ Completed | `app/(auth)/register-business/page.tsx`, `app/api/business/register/route.ts` |
| **T13** | E2E Testing Suite (Playwright) | ✅ Completed | `playwright.config.ts`, `tests/e2e.spec.ts` (booking, collision 409, route guards, 401 checks) |

## Data & Production Reality Guide

- **Live Database-Backed vs. Pre-Seeded Data:**
  - **Live Dynamic Flow:** Business registration (`/register-business`), customer slot reservations (`/b/[slug]`), cancellation (`/customer/bookings`), service CRUD (`/owner`), and queue call-outs (`/staff`) read and write directly to live PostgreSQL tables via Supabase with active RLS and GiST exclusion constraints.
  - **Pre-Seeded Tenants:** The database seeds two initial reference businesses: `glow-clinic` (Medical Spa) and `urban-blade` (Barbershop).
  - **Local Fallback Stubs:** `lib/mock-data.ts` contains fallback fixtures used strictly if the live database connection is completely unconfigured or unreachable.
- **Double-Booking Elimination:** Postgres exclusion constraint via `btree_gist` on `(business_id, tstzrange(starts_at, ends_at))` guaranteeing zero double-bookings at the database engine level.
- **Strict Authorization on Actions:** Both `/api/bookings/cancel` and `/api/queue/call-next` verify authenticated identity and validate customer ownership or `has_role(business_id, ['owner', 'staff'])` before performing mutations.
- **Next.js Middleware Guards:** `middleware.ts` intercepts `/owner`, `/staff`, and `/customer` paths, redirecting unauthenticated visitors to `/login?next=...`. Portals explicitly block non-members without falling back to unrelated tenants.
- **RLS Slot Security & Function Hardening:** All `SECURITY DEFINER` functions (`has_role`, `get_busy_slots`, `handle_new_user`) use `SET search_path = public` to comply with Supabase Security Advisor guidelines.
- **Ghost Booking Prevention & Atomicity:** Stripe webhooks record events only upon successful processing, using unique-key constraint handling to guarantee idempotency under concurrent retries.
