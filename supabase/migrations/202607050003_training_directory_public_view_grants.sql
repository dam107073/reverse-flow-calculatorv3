-- Reverse Flow Training Directory - restore public read access to the
-- published-listings view without opening submissions or admin fields.

revoke all on table public.training_listings from anon, authenticated;
revoke all on table public.training_listing_submissions from anon, authenticated;
revoke all on table public.training_listing_management_links from anon, authenticated;

create or replace view public.public_training_listings
with (security_invoker = false)
as
select
  id,
  listing_type,
  public_title,
  slug,
  organization_name,
  instructor_name,
  public_email,
  public_phone,
  website_url,
  facebook_url,
  instagram_url,
  linkedin_url,
  youtube_url,
  service_area_summary,
  states_served,
  specialty_ids,
  additional_instructors,
  app_summary,
  public_profile,
  logo_path,
  banner_path,
  sort_priority,
  published_at,
  updated_at
from public.training_listings
where is_active = true
  and is_hidden = false
  and published_at <= now();

grant usage on schema public to anon, authenticated;
grant select on table public.public_training_listings to anon, authenticated;
grant select on table public.training_listing_specialties to anon, authenticated;

-- Keep backend API compatibility for server-side routes that may use the
-- Supabase service role or a Supabase secret key.
grant usage on schema public to service_role;
grant select on table public.public_training_listings to service_role;
grant select on table public.training_listing_specialties to service_role;
