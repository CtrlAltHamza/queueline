# Queueline: Implementation Plan

A booking and live-queue app for small clinics and salons. Customers book slots and pay a deposit, join a live queue and see their position. Staff run the day's schedule and queue. Owners manage services, hours and see business stats.

Work from tickets. Each ticket has a "Done when" check, and `PROGRESS.md` is updated after every ticket.

## 1. Stack

- **App:** Next.js (app router) + TypeScript, Tailwind, `@supabase/ssr`, Zod
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Integrations:** Stripe Checkout (test mode), Resend, optional Twilio
- **Testing and delivery:** pgTAP, Playwright, GitHub Actions, Vercel preview deploys
- **Local dev:** Supabase CLI (runs its own Docker containers) plus your own `docker-compose.yml`

## 2. Repo layout

```
queueline/
  app/                 # (public)/b/[slug], (customer), (staff), (owner), api/
  components/
  lib/                 # supabase clients, stripe, resend, zod schemas
  supabase/
    migrations/        # all schema and RLS as SQL files
    tests/             # pgTAP tests for RLS
    seed.sql
  e2e/                 # Playwright specs
  tickets/             # one markdown file per ticket
  Dockerfile
  docker-compose.yml
  .env.example
  PROGRESS.md
  README.md
```

## 3. Data model

| Table | Purpose / key columns |
|---|---|
| `profiles` | id (= auth user id), name, phone |
| `businesses` | slug, name, timezone, deposit_cents |
| `memberships` | business_id, user_id, role (`owner` or `staff`) |
| `services` | business_id, name, duration_min, price_cents |
| `business_hours` | business_id, weekday, opens, closes |
| `bookings` | business_id, service_id, staff_id, customer_id, starts_at, ends_at, status (`pending_payment`, `confirmed`, `cancelled`, `no_show`, `completed`) |
| `queue_entries` | business_id, customer_id, ticket_no, status (`waiting`, `called`, `served`, `no_show`, `left`) |
| `stripe_events` | event id as primary key, so webhooks are idempotent |

**Double-booking prevention:** a Postgres exclusion constraint on `(staff_id, tstzrange(starts_at, ends_at))` for active bookings (requires the `btree_gist` extension). The database rejects overlaps, so the app does not have to be trusted.

## 4. Row-level security design

- Helper function `has_role(business_id, roles[])`, `security definer` with a fixed `search_path`. It checks `memberships` so policies stay short and avoid recursion.
- **Customers:** read and insert only rows where `customer_id = auth.uid()`. They can cancel their own booking but cannot edit status or price.
- **Staff:** read and update bookings and queue entries for their own business only.
- **Owners:** full access to their own business, including services, hours and memberships.
- **Anonymous visitors:** read active businesses, services and hours only, so the public booking page works.
- The service-role key is used only in server code and webhooks, never in the browser.

## 5. Build plan (about 3 weeks)

### Week 1: foundation and security
- **T1 Project setup.** Next.js, Supabase CLI, Docker, CI skeleton.
  *Done when:* a clean clone runs locally with `supabase start` and `docker compose up`.
- **T2 Schema migrations, seed data, generated types.**
  *Done when:* `supabase db reset` rebuilds everything from scratch.
- **T3 RLS policies and pgTAP tests.**
  *Done when:* tests prove a customer cannot read another customer's booking and staff cannot touch another business.
- **T4 Auth and role-based redirects.**
  *Done when:* each role lands in its own area and cannot open the others.

### Week 2: core flows
- **T5 Public business page with slot picker.** Slots come from business hours, service duration and existing bookings.
  *Done when:* an overlapping slot is never offered, and the database rejects it if forced.
- **T6 Booking with Stripe deposit.** Create a `pending_payment` booking, send the user to Stripe Checkout, and handle `checkout.session.completed` in a webhook that verifies the signature, checks `stripe_events`, then sets `confirmed`.
  *Done when:* a test payment confirms the booking exactly once, even if the webhook fires twice.
- **T7 Resend confirmation email.**
  *Done when:* the email is sent from the webhook, failures are logged, and an email failure never breaks the booking.
- **T8 Customer "my bookings" page with cancel.**
  *Done when:* cancelling frees the slot.

### Week 3: realtime, dashboards, polish
- **T9 Live queue.** Join the queue, see your position, staff "call next".
  *Done when:* two browser sessions see updates within about a second, and no business sees another's queue.
- **T10 Staff schedule and queue board, with no-show handling.**
- **T11 Owner dashboard.** Bookings per day, revenue and no-show rate (SQL views or RPC functions), plus services and hours management.
- **T12 Polish.** Mobile layout, loading and empty states, no console errors, one small Framer Motion touch (for example when the queue position changes).
- **T13 README.** Screenshots, architecture diagram and a 2-minute demo video.

### Optional extras
- Twilio SMS reminders (trial accounts can only message verified numbers).
- Wait-time estimate from past service durations.

## 6. Docker setup

- **Dockerfile:** multi-stage build using Next.js `output: 'standalone'`, running as a non-root user.
- **docker-compose.yml:** the `app` service, plus a `stripe` service using the `stripe/stripe-cli` image running `listen --forward-to app:3000/api/stripe/webhook`.
- **Supabase** runs separately through `supabase start` (Postgres, Auth, Realtime and a local mail catcher in Docker).
- The README gives a three-command quick start.

## 7. Testing and CI

- **pgTAP** (`supabase test db`) for RLS policies.
- **Unit tests** for slot calculation.
- **Playwright:** one spec per feature. Test users are created in a global setup script and reused through `storageState`. Data comes from `supabase db reset`.
- **GitHub Actions:** install the Supabase CLI, `supabase start`, `db reset`, lint, typecheck, pgTAP, then Playwright. Upload the Playwright report as an artifact.

## 8. Deployment

- Hosted Supabase project for staging and production, with migrations applied through `supabase db push`.
- Vercel preview deploys on every pull request, with Stripe test keys in environment variables.
- Register one stable Stripe webhook endpoint for the production deploy. Preview URLs change, so use the Stripe CLI locally.
- Resend only delivers to your own address until you verify a domain. That is fine for demos.

## 9. Definition of done (every ticket)

- Works on mobile
- No console errors
- Covered by a Playwright test
- RLS verified where data access is involved
- `PROGRESS.md` updated

## 10. If time runs short

Cut in this order: Twilio, wait-time estimate, owner revenue charts, Framer Motion.

Never cut: RLS tests, Stripe webhook idempotency, Playwright coverage.

## 11. Ticket template

```
# T<number>: <title>
**Goal:** one sentence.
**Done when:**
- [ ] observable check 1
- [ ] observable check 2
**Notes:** decisions, links, gotchas.
```
