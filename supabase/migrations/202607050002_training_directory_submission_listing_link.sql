-- Reverse Flow Training Directory - allow approved new-listing submissions
-- to link to the listing created during editorial approval.

alter table public.training_listing_submissions
  drop constraint if exists training_listing_submissions_new_listing_without_listing;

alter table public.training_listing_submissions
  drop constraint if exists training_listing_submissions_update_requires_listing;

alter table public.training_listing_submissions
  add constraint training_listing_submissions_listing_link_valid check (
    (
      submission_type = 'new_listing'
      and (
        (status <> 'approved' and listing_id is null)
        or
        (status = 'approved' and listing_id is not null)
      )
    )
    or
    (
      submission_type = 'update_existing'
      and listing_id is not null
    )
  );
