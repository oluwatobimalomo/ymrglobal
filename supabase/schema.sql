-- Run this in the Supabase SQL Editor before configuring the website keys.
-- Public visitors may insert valid submissions, but cannot read or change rows.

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  prayer_focus text not null,
  prayer_request text not null,
  created_at timestamptz not null default now(),
  constraint prayer_requests_name_length check (name is null or length(btrim(name)) <= 100),
  constraint prayer_requests_email_length check (email is null or length(btrim(email)) <= 200),
  constraint prayer_requests_email_format check (
    email is null or btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint prayer_requests_focus_valid check (prayer_focus in (
    'Family & relationships',
    'Health & healing',
    'Education',
    'Work & provision',
    'Direction & purpose',
    'Faith & spiritual growth',
    'Other'
  )),
  constraint prayer_requests_text_length check (length(btrim(prayer_request)) between 10 and 2500)
);

create table if not exists public.testimony_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  testimony text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint testimony_submissions_name_length check (length(btrim(name)) between 1 and 100),
  constraint testimony_submissions_category_valid check (category in (
    'Healings',
    'Academic Breakthroughs',
    'Marital Settlement',
    'Family & Fruitfulness',
    'Open Doors & Provision',
    'Business Breakthrough'
  )),
  constraint testimony_submissions_text_length check (length(btrim(testimony)) between 20 and 2500),
  constraint testimony_submissions_status_valid check (status in ('pending', 'approved', 'rejected'))
);

alter table public.prayer_requests enable row level security;
alter table public.testimony_submissions enable row level security;

-- Remove default API access and regrant only the insert columns required by forms.
revoke all on table public.prayer_requests from public, anon, authenticated;
revoke all on table public.testimony_submissions from public, anon, authenticated;
grant usage on schema public to anon;
grant insert (name, email, prayer_focus, prayer_request)
  on table public.prayer_requests to anon;
grant insert (name, category, testimony)
  on table public.testimony_submissions to anon;

drop policy if exists "Public can submit prayer requests" on public.prayer_requests;
create policy "Public can submit prayer requests"
  on public.prayer_requests
  for insert
  to anon
  with check (true);

drop policy if exists "Public can submit testimonies for review" on public.testimony_submissions;
create policy "Public can submit testimonies for review"
  on public.testimony_submissions
  for insert
  to anon
  with check (status = 'pending');

comment on table public.prayer_requests is
  'Private prayer requests submitted through the YMR Prayer Wall. Public API access is insert-only.';
comment on table public.testimony_submissions is
  'Testimonies awaiting YMR review. Public API access is insert-only; status is not client-writable.';
