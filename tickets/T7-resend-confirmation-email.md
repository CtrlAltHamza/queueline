# T7: Resend Confirmation Email

**Goal:** Dispatch transactional booking confirmation email upon payment confirmation using Resend.

**Done when:**
- [x] Email template displays booking code, service name, staff member, date, time, business address, and cancel link
- [x] Resend API client triggers email upon successful Stripe payment confirmation
- [x] Email dispatch errors are logged without rolling back the confirmed booking status
- [x] Fallback logging when email delivery cannot be completed

**Notes:**
- Handles test API keys gracefully when running without live verified domain.
