# T5: Public Business Page with Slot Picker

**Goal:** Provide responsive public booking page at `/b/[slug]` with date picker, staff/service selector, and slot calculation.

**Done when:**
- [x] Route `/b/[slug]` renders business profile, services list with duration and pricing
- [x] Available time slots are dynamically calculated based on business hours, staff shifts, service duration, and existing non-cancelled bookings
- [x] Overlapping slots are never offered to the customer
- [x] Booking confirmation preview shows pricing breakdown and deposit requirement
- [x] Mobile responsive UI with fast client-side calendar navigation

**Notes:**
- Slot calculation supports variable buffer times and handles timezone conversions cleanly.
