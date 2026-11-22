# T6: Booking with Stripe Deposit and Webhooks

**Goal:** Secure booking flow requiring deposit payment through Stripe Checkout with idempotent webhook processing.

**Done when:**
- [x] Booking initiated in `pending_payment` status
- [x] Stripe Checkout session created with booking ID metadata and deposit amount
- [x] Webhook route `/api/stripe/webhook` validates Stripe signature using webhook secret
- [x] Webhook records event in `stripe_events` to ensure strict idempotency
- [x] Upon payment success, booking status transitions to `confirmed`
- [x] Database exclusion constraint protects against concurrent double-booking during checkout

**Notes:**
- If webhook is received more than once, second event is ignored cleanly.
