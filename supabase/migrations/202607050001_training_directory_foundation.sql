-- Reverse Flow Training Directory - Milestone 1 backend foundation.
-- This migration intentionally does not connect the existing mock UI to live data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.training_listing_specialties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_listing_specialties_slug_not_blank check (btrim(slug) <> ''),
  constraint training_listing_specialties_display_name_not_blank check (btrim(display_name) <> '')
);

create table if not exists public.training_listings (
  id uuid primary key default gen_random_uuid(),
  listing_type text not null,
  public_title text not null,
  slug text not null unique,
  organization_name text,
  instructor_name text,
  primary_contact_name text not null,
  management_email text not null,
  public_email text,
  public_phone text,
  website_url text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  youtube_url text,
  service_area_summary text not null,
  states_served text[] not null,
  specialty_ids uuid[] not null,
  additional_instructors jsonb not null default '[]'::jsonb,
  app_summary text not null,
  public_profile text not null,
  logo_path text,
  banner_path text,
  internal_notes text,
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  sort_priority integer not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_listings_listing_type_valid check (listing_type in ('organization', 'individual')),
  constraint training_listings_title_not_blank check (btrim(public_title) <> ''),
  constraint training_listings_slug_not_blank check (btrim(slug) <> ''),
  constraint training_listings_primary_contact_not_blank check (btrim(primary_contact_name) <> ''),
  constraint training_listings_management_email_not_blank check (btrim(management_email) <> ''),
  constraint training_listings_service_area_not_blank check (btrim(service_area_summary) <> ''),
  constraint training_listings_app_summary_not_blank check (btrim(app_summary) <> ''),
  constraint training_listings_public_profile_not_blank check (btrim(public_profile) <> ''),
  constraint training_listings_organization_name_required check (
    listing_type <> 'organization' or btrim(coalesce(organization_name, '')) <> ''
  ),
  constraint training_listings_instructor_name_required check (
    listing_type <> 'individual' or btrim(coalesce(instructor_name, '')) <> ''
  ),
  constraint training_listings_states_served_required check (cardinality(states_served) > 0),
  constraint training_listings_specialties_required check (cardinality(specialty_ids) > 0),
  constraint training_listings_additional_instructors_array check (jsonb_typeof(additional_instructors) = 'array'),
  constraint training_listings_app_summary_length check (char_length(app_summary) <= 300),
  constraint training_listings_public_profile_length check (char_length(public_profile) <= 5000)
);

create table if not exists public.training_listing_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null,
  status text not null default 'submitted',
  listing_id uuid references public.training_listings(id) on delete set null,
  requested_slug text,
  resolved_slug text,
  listing_payload jsonb not null,
  submitter_name text not null,
  submitter_email text not null,
  management_email text not null,
  reviewer_notes text,
  request_changes_message text,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_listing_submissions_type_valid check (submission_type in ('new_listing', 'update_existing')),
  constraint training_listing_submissions_status_valid check (
    status in ('submitted', 'under_review', 'changes_requested', 'resubmitted', 'approved', 'rejected', 'cancelled')
  ),
  constraint training_listing_submissions_update_requires_listing check (
    submission_type <> 'update_existing' or listing_id is not null
  ),
  constraint training_listing_submissions_new_listing_without_listing check (
    submission_type <> 'new_listing' or listing_id is null
  ),
  constraint training_listing_submissions_payload_object check (jsonb_typeof(listing_payload) = 'object'),
  constraint training_listing_submissions_submitter_name_not_blank check (btrim(submitter_name) <> ''),
  constraint training_listing_submissions_submitter_email_not_blank check (btrim(submitter_email) <> ''),
  constraint training_listing_submissions_management_email_not_blank check (btrim(management_email) <> '')
);

create table if not exists public.training_listing_management_links (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.training_listings(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint training_listing_management_links_email_not_blank check (btrim(email) <> ''),
  constraint training_listing_management_links_token_hash_not_blank check (btrim(token_hash) <> '')
);

create or replace function public.validate_training_listing_specialty_ids()
returns trigger
language plpgsql
as $$
declare
  missing_count integer;
begin
  if new.specialty_ids is null or cardinality(new.specialty_ids) = 0 then
    raise exception 'training_listings.specialty_ids must include at least one specialty';
  end if;

  select count(*)
  into missing_count
  from unnest(new.specialty_ids) as submitted_specialty_id
  left join public.training_listing_specialties specialty
    on specialty.id = submitted_specialty_id
  where specialty.id is null;

  if missing_count > 0 then
    raise exception 'training_listings.specialty_ids contains an unknown specialty id';
  end if;

  return new;
end;
$$;

drop trigger if exists training_listing_specialties_set_updated_at on public.training_listing_specialties;
create trigger training_listing_specialties_set_updated_at
before update on public.training_listing_specialties
for each row execute function public.set_updated_at();

drop trigger if exists training_listings_set_updated_at on public.training_listings;
create trigger training_listings_set_updated_at
before update on public.training_listings
for each row execute function public.set_updated_at();

drop trigger if exists training_listing_submissions_set_updated_at on public.training_listing_submissions;
create trigger training_listing_submissions_set_updated_at
before update on public.training_listing_submissions
for each row execute function public.set_updated_at();

drop trigger if exists training_listings_validate_specialty_ids on public.training_listings;
create trigger training_listings_validate_specialty_ids
before insert or update of specialty_ids on public.training_listings
for each row execute function public.validate_training_listing_specialty_ids();

create index if not exists training_listing_specialties_active_sort_idx
  on public.training_listing_specialties (is_active, sort_order, display_name);

create index if not exists training_listings_public_directory_idx
  on public.training_listings (is_active, is_hidden, sort_priority, public_title);

create index if not exists training_listings_slug_idx
  on public.training_listings (slug);

create index if not exists training_listings_states_served_gin_idx
  on public.training_listings using gin (states_served);

create index if not exists training_listings_specialty_ids_gin_idx
  on public.training_listings using gin (specialty_ids);

create index if not exists training_listing_submissions_status_submitted_idx
  on public.training_listing_submissions (status, submitted_at desc);

create index if not exists training_listing_submissions_listing_idx
  on public.training_listing_submissions (listing_id, submitted_at desc);

create index if not exists training_listing_management_links_listing_idx
  on public.training_listing_management_links (listing_id);

create index if not exists training_listing_management_links_active_token_idx
  on public.training_listing_management_links (token_hash)
  where revoked_at is null;

alter table public.training_listing_specialties enable row level security;
alter table public.training_listings enable row level security;
alter table public.training_listing_submissions enable row level security;
alter table public.training_listing_management_links enable row level security;

drop policy if exists "Public can read active training specialties" on public.training_listing_specialties;
create policy "Public can read active training specialties"
on public.training_listing_specialties
for select
to anon, authenticated
using (is_active = true);

-- Fail closed for direct table access. Public listing reads should use the
-- public_training_listings view, which excludes management_email and internal_notes.
drop policy if exists "Public can read published training listings" on public.training_listings;
drop policy if exists "Public cannot read training submissions" on public.training_listing_submissions;
drop policy if exists "Public cannot read management links" on public.training_listing_management_links;

revoke all on table public.training_listings from anon, authenticated;
revoke all on table public.training_listing_submissions from anon, authenticated;
revoke all on table public.training_listing_management_links from anon, authenticated;

create or replace view public.public_training_listings as
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

grant select on table public.public_training_listings to anon, authenticated;
grant select on table public.training_listing_specialties to anon, authenticated;

create or replace function public.is_published_training_logo_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_listings listing
    where listing.logo_path = object_name
      and listing.is_active = true
      and listing.is_hidden = false
      and listing.published_at <= now()
  );
$$;

create or replace function public.is_published_training_banner_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_listings listing
    where listing.banner_path = object_name
      and listing.is_active = true
      and listing.is_hidden = false
      and listing.published_at <= now()
  );
$$;

revoke all on function public.is_published_training_logo_path(text) from public;
revoke all on function public.is_published_training_banner_path(text) from public;
grant execute on function public.is_published_training_logo_path(text) to anon, authenticated;
grant execute on function public.is_published_training_banner_path(text) to anon, authenticated;

insert into public.training_listing_specialties (slug, display_name, sort_order)
values
  ('fire-attack-package-design', 'Fire Attack Package Design', 10),
  ('engine-company-operations', 'Engine Company Operations', 20),
  ('truck-company-operations', 'Truck Company Operations', 30),
  ('standpipe-operations', 'Standpipe Operations', 40),
  ('pump-operations', 'Pump Operations', 50),
  ('water-supply', 'Water Supply', 60),
  ('rural-water-supply', 'Rural Water Supply', 70),
  ('apparatus-specifications', 'Apparatus Specifications', 80),
  ('hose-nozzle-selection', 'Hose & Nozzle Selection', 90),
  ('officer-development', 'Officer Development', 100),
  ('leadership', 'Leadership', 110),
  ('fire-behavior', 'Fire Behavior', 120),
  ('tactical-decision-making', 'Tactical Decision Making', 130),
  ('search-rescue', 'Search & Rescue', 140),
  ('ventilation', 'Ventilation', 150),
  ('wildland', 'Wildland', 160),
  ('industrial-firefighting', 'Industrial Firefighting', 170),
  ('airport-firefighting', 'Airport Firefighting', 180),
  ('instructor-development', 'Instructor Development', 190),
  ('driver-operator', 'Driver/Operator', 200),
  ('incident-command', 'Incident Command', 210)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into storage.buckets (id, name, public)
values
  ('training-logos', 'training-logos', false),
  ('training-banners', 'training-banners', false),
  ('training-submissions', 'training-submissions', false)
on conflict (id) do update
set public = false;

drop policy if exists "Public can read published training logos" on storage.objects;
create policy "Public can read published training logos"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'training-logos'
  and public.is_published_training_logo_path(storage.objects.name)
);

drop policy if exists "Public can read published training banners" on storage.objects;
create policy "Public can read published training banners"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'training-banners'
  and public.is_published_training_banner_path(storage.objects.name)
);

drop policy if exists "Public cannot read training submission uploads" on storage.objects;
drop policy if exists "Public cannot upload training assets" on storage.objects;

-- No public insert/update/delete storage policies are created in Milestone 1.
-- Uploads, review workflows, and asset promotion belong to later milestones.
