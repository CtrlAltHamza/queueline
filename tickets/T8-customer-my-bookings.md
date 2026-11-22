# T8: Customer "My Bookings" Page with Cancellation

**Goal:** Allow customers to view their upcoming and past bookings, and cancel eligible reservations.

**Done when:**
- [x] Customer dashboard at `/customer/bookings` displays upcoming appointments and booking history
- [x] Status badges distinguish `confirmed`, `pending_payment`, `completed`, and `cancelled` bookings
- [x] Customer can cancel their upcoming reservation with confirmation prompt
- [x] Cancellation updates booking status to `cancelled` and immediately frees up the calendar slot for others

**Notes:**
- RLS policy guarantees customers can only view and cancel their own bookings.
