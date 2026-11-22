# T4: Authentication and Role-Based Routing

**Goal:** Setup Supabase Auth with server/client session synchronization and role-based route middleware.

**Done when:**
- [x] Supabase server and client auth helpers configured (`@supabase/ssr`)
- [x] Auth callback handler (`/api/auth/callback`) handles session exchange
- [x] Middleware protects `(customer)`, `(staff)`, and `(owner)` routes
- [x] Role-based redirection sends owners to `/owner`, staff to `/staff`, customers to `/customer`, and guests to `/login`
- [x] Navigation bar dynamically displays user profile, role badge, and relevant dashboard links

**Notes:**
- Support demo role switching / quick sign-in for seamless review and testing.
