# Training Directory Environment

Milestone 1 creates the Supabase database, RLS, storage policies, and specialty seed data. The public submission flow is owned by the separate website repo that deploys `reverse-flow.app`. This app repo owns Training Directory browsing and links users to the website submission page.

## App client variables

No Supabase or Resend secrets belong in this app repo. The app submit CTA points to `https://reverse-flow.app/training-directory/submit`.

## Secret safety

Local `.env` files are ignored by git. Commit only `.env.example` with empty or non-secret placeholder values.

Do not place `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in this app repo, static files under `www/`, Capacitor copied assets, or browser-visible JavaScript.

## Submission flow

The native app and calculator web surface do not maintain a duplicate submission form. They send users to:

- `https://reverse-flow.app/training-directory/submit`

The website repo owns:

- `/training-directory/submit`
- `/api/training-directory/submit`
- `/api/training-directory/specialties`

The website Vercel project owns `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any future email workflow secrets. The service role key is used only inside website API routes to validate specialties, upload images to `training-submissions`, and insert a `training_listing_submissions` record.

Do not add public insert policies or public upload policies for Milestone 2.

## Supabase notes

The existing storage buckets are expected to remain:

- `training-logos`
- `training-banners`
- `training-submissions`

The Milestone 1 migration keeps those bucket names and applies private-bucket storage policies. Public reads for logos and banners are limited to object paths referenced by active, non-hidden published listings. Public writes and pending submission asset reads are not opened in Milestone 1.
