# T9: Live Queue and Realtime Position

**Goal:** Provide live queue joining for customers and realtime broadcast of queue position and current serving ticket.

**Done when:**
- [x] Customer can join the day's walk-in queue at `/b/[slug]/queue` or view their ticket at `/queue/[id]`
- [x] Live position card displays current ticket number, customer's ticket number, estimated wait, and people ahead
- [x] Realtime subscription via Supabase Realtime channel updates ticket state instantly without page refresh
- [x] Multi-tenant isolation ensures businesses never see tickets from other businesses

**Notes:**
- Includes sound/vibration notification trigger when customer is called next.
