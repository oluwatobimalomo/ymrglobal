-- Public YMR 2026 registration forms may insert submissions, but cannot read or edit them.

create table if not exists public.campus_leader_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text not null,
  email text not null,
  school_name text not null,
  fellowship_name text not null,
  created_at timestamptz not null default now(),
  constraint campus_registration_full_name_length check (length(btrim(full_name)) between 1 and 120),
  constraint campus_registration_phone_length check (length(btrim(phone_number)) between 5 and 40),
  constraint campus_registration_email_length check (length(btrim(email)) <= 200),
  constraint campus_registration_email_format check (btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint campus_registration_school_length check (length(btrim(school_name)) between 1 and 180),
  constraint campus_registration_fellowship_length check (length(btrim(fellowship_name)) between 1 and 180)
);

create table if not exists public.pastor_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact_person text,
  contact_information text not null,
  email text not null,
  denomination_church text not null,
  arrival_date date not null,
  departure_date date not null,
  quarters_assistance text not null,
  nights smallint not null,
  accompanying_people smallint not null,
  comments text,
  created_at timestamptz not null default now(),
  constraint pastor_registration_full_name_length check (length(btrim(full_name)) between 1 and 120),
  constraint pastor_registration_contact_person_length check (contact_person is null or length(btrim(contact_person)) <= 120),
  constraint pastor_registration_contact_length check (length(btrim(contact_information)) between 5 and 500),
  constraint pastor_registration_email_length check (length(btrim(email)) <= 200),
  constraint pastor_registration_email_format check (btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint pastor_registration_church_length check (length(btrim(denomination_church)) between 1 and 180),
  constraint pastor_registration_dates_valid check (departure_date >= arrival_date),
  constraint pastor_registration_quarters_valid check (quarters_assistance in ('Yes', 'No', 'Maybe')),
  constraint pastor_registration_nights_valid check (nights between 0 and 30),
  constraint pastor_registration_people_valid check (accompanying_people between 0 and 100),
  constraint pastor_registration_comments_length check (comments is null or length(btrim(comments)) <= 2000)
);

alter table public.campus_leader_registrations enable row level security;
alter table public.pastor_registrations enable row level security;

revoke all on table public.campus_leader_registrations from public, anon, authenticated;
revoke all on table public.pastor_registrations from public, anon, authenticated;
grant usage on schema public to anon;
grant insert (full_name, phone_number, email, school_name, fellowship_name)
  on table public.campus_leader_registrations to anon;
grant insert (full_name, contact_person, contact_information, email, denomination_church, arrival_date, departure_date, quarters_assistance, nights, accompanying_people, comments)
  on table public.pastor_registrations to anon;

drop policy if exists "Public can submit campus leader registrations" on public.campus_leader_registrations;
create policy "Public can submit campus leader registrations"
  on public.campus_leader_registrations for insert to anon with check (true);

drop policy if exists "Public can submit pastor registrations" on public.pastor_registrations;
create policy "Public can submit pastor registrations"
  on public.pastor_registrations for insert to anon with check (true);

comment on table public.campus_leader_registrations is
  'YMR 2026 campus leader registrations. Public API access is insert-only.';
comment on table public.pastor_registrations is
  'YMR 2026 pastor and ministry head registrations. Public API access is insert-only.';
