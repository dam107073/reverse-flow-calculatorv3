-- Reverse Flow Training Directory - preserve approved submission history and
-- retire published listings through visibility fields instead of hard delete.

alter table public.training_listing_submissions
  drop constraint if exists training_listing_submissions_listing_id_fkey;

alter table public.training_listing_submissions
  add constraint training_listing_submissions_listing_id_fkey
  foreign key (listing_id)
  references public.training_listings(id)
  on delete restrict;

comment on column public.training_listings.is_active is
  'When false, the listing is retired from the public Training Directory without deleting submission history.';

comment on column public.training_listings.is_hidden is
  'When true, the listing is hidden from the public Training Directory without deleting submission history.';

create index if not exists training_listings_visibility_idx
  on public.training_listings (is_active, is_hidden, published_at);
