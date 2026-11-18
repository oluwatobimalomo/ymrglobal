-- Public delegate registration form. The public API can insert submissions, but cannot read or edit them.

create table if not exists public.delegate_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone_number text not null,
  email text not null,
  origin_city text not null,
  arrival_date date not null,
  arrival_time time not null,
  airport_pickup text not null,
  departure_at timestamp without time zone not null,
  airport_dropoff text not null,
  accommodation_preference text not null,
  next_of_kin_name text not null,
  next_of_kin_phone text not null,
  comments text,
  created_at timestamptz not null default now(),
  constraint delegate_full_name_length check (length(btrim(full_name)) between 1 and 120),
  constraint delegate_phone_format check (btrim(phone_number) ~ '^\+[1-9][0-9]{6,14}$'),
  constraint delegate_email_length check (length(btrim(email)) <= 200),
  constraint delegate_email_format check (btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint delegate_origin_city_length check (length(btrim(origin_city)) between 1 and 180),
  constraint delegate_pickup_choice check (airport_pickup in ('Yes, I need transportation recommendations', 'No, I will arrange my own transportation')),
  constraint delegate_dropoff_choice check (airport_dropoff in ('Yes, I need transportation recommendations', 'No, I will arrange my own transportation')),
  constraint delegate_accommodation_choice check (accommodation_preference in ('Yes, I would like to use the discounted accommodation option', 'No, I will arrange my own accommodation')),
  constraint delegate_next_of_kin_name_length check (length(btrim(next_of_kin_name)) between 1 and 120),
  constraint delegate_next_of_kin_phone_format check (btrim(next_of_kin_phone) ~ '^\+[1-9][0-9]{6,14}$'),
  constraint delegate_comments_length check (comments is null or length(btrim(comments)) <= 2000)
);

alter table public.delegate_registrations enable row level security;
revoke all on table public.delegate_registrations from public, anon, authenticated;
grant usage on schema public to anon;
grant insert (full_name, phone_number, email, origin_city, arrival_date, arrival_time, airport_pickup, departure_at, airport_dropoff, accommodation_preference, next_of_kin_name, next_of_kin_phone, comments)
  on table public.delegate_registrations to anon;

drop policy if exists "Public can submit delegate registrations" on public.delegate_registrations;
create policy "Public can submit delegate registrations"
  on public.delegate_registrations for insert to anon with check (true);

comment on table public.delegate_registrations is
  'YMR 2026 international delegate registrations. Public API access is insert-only.';
