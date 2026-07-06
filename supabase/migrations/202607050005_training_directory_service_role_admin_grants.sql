-- Reverse Flow Training Directory - backend/admin service role privileges.
-- Public access remains limited to public_training_listings and active specialties.

revoke all on table public.training_listings from anon, authenticated;
revoke all on table public.training_listing_submissions from anon, authenticated;
revoke all on table public.training_listing_management_links from anon, authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.training_listings
  to service_role;

grant select, insert, update
  on table public.training_listing_submissions
  to service_role;

grant select, insert, update, delete
  on table public.training_listing_management_links
  to service_role;

grant select
  on table public.training_listing_specialties
  to service_role;

grant select
  on table public.public_training_listings
  to service_role;
