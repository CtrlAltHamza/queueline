# T3: Row-Level Security (RLS) Policies and Tests

**Goal:** Implement robust Row-Level Security policies with `has_role` helper function and verification tests.

**Done when:**
- [x] `has_role(business_id, roles[])` security definer function implemented with clean search path
- [x] Customers can only select and insert their own bookings/queue entries (`customer_id = auth.uid()`)
- [x] Staff can only read and update bookings and queue entries for their affiliated business
- [x] Owners have full management access (services, hours, memberships, bookings, queue) for their business
- [x] Anonymous visitors can read active businesses, services, and business hours
- [x] Service-role key restricted strictly to backend APIs and webhooks
- [x] pgTAP test suite verifies isolation between customers and across businesses

**Notes:**
- Security definer avoids infinite recursion when checking `memberships`.
