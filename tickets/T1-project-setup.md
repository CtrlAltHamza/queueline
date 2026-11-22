# T1: Project Setup

**Goal:** Initialize Next.js 15 (App Router) with TypeScript, Tailwind CSS, Lucide icons, Supabase SSR client, Docker and GitHub Actions CI skeleton.

**Done when:**
- [x] Next.js project configured with TypeScript and Tailwind CSS
- [x] `@supabase/ssr` and Supabase client helpers structured in `lib/supabase`
- [x] Dockerfile and docker-compose.yml configured for local development and standalone build
- [x] GitHub Actions workflow `.github/workflows/ci.yml` created
- [x] Environment configuration templates (`.env.example`) present

**Notes:**
- Uses App Router with route groups `(public)`, `(customer)`, `(staff)`, `(owner)` and `api/`.
- Configured for standalone Docker build and Vercel edge/node deployment.
