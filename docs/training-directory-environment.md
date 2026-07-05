# Training Directory Environment

Milestone 1 creates the Supabase database, RLS, storage policies, and specialty seed data. Milestone 2 adds the public submission flow through same-origin Vercel API routes while keeping the existing mock Training Directory browsing UI in place.

## Required variables

- `SUPABASE_URL`: Supabase project API URL.
- `SUPABASE_ANON_KEY`: Public anon key for future browser reads from approved public surfaces.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key for migrations, admin workflows, Edge Functions, and Resend-triggered workflows. Never expose this in `www/`.
- `SUPABASE_PROJECT_REF`: Supabase project reference for CLI linking/deploys.
- `RESEND_API_KEY`: Server-only Resend key for later notification milestones. Never expose this in `www/`.
- `TRAINING_DIRECTORY_FROM_EMAIL`: Sender identity for Training Directory workflow email. Use `Reverse Flow Training Directory <submissions@reverse-flow.app>`.
- `TRAINING_DIRECTORY_ADMIN_EMAIL`: Internal review/notification destination, normally `submissions@reverse-flow.app` or `derek@reverse-flow.app`.
- `PUBLIC_SITE_URL`: Public production origin, currently `https://reverse-flow.app`.

## Secret safety

Local `.env` files are ignored by git. Commit only `.env.example` with empty or non-secret placeholder values.

Do not place `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in static files under `www/`, Capacitor copied assets, browser-visible JavaScript, or public Vercel environment variables.

## Milestone 2 submission flow

The browser posts public submissions to:

- `/api/training-directory/submit`

The browser loads controlled specialties from:

- `/api/training-directory/specialties`

Both routes run server-side on Vercel and use `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` from Vercel environment variables. The service role key is used only inside the API routes to validate specialties, upload images to `training-submissions`, and insert a `training_listing_submissions` record.

Do not add public insert policies or public upload policies for Milestone 2.

## Supabase notes

The existing storage buckets are expected to remain:

- `training-logos`
- `training-banners`
- `training-submissions`

The Milestone 1 migration keeps those bucket names and applies private-bucket storage policies. Public reads for logos and banners are limited to object paths referenced by active, non-hidden published listings. Public writes and pending submission asset reads are not opened in Milestone 1.
