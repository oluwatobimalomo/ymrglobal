-- Viewing-centre interest submissions and the YMR Global Blog CMS.
-- Run in Supabase SQL Editor after the existing registration and team access migrations.

alter table public.team_access drop constraint if exists team_access_team_check;
alter table public.team_access add constraint team_access_team_check
  check (team in ('prayer', 'testimony', 'secretariat', 'writer'));

create table if not exists public.viewing_centre_interests (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  contact text not null,
  email text not null,
  location_scope text not null,
  country text,
  geopolitical_zone text,
  exact_address text not null,
  created_at timestamptz not null default now(),
  constraint viewing_centre_host_name_length check (length(btrim(host_name)) between 1 and 120),
  constraint viewing_centre_contact_length check (length(btrim(contact)) between 5 and 40),
  constraint viewing_centre_email_valid check (btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint viewing_centre_location_valid check (
    (location_scope = 'International' and country is not null and length(btrim(country)) between 2 and 100 and geopolitical_zone is null)
    or (location_scope = 'Within Nigeria' and country is null and geopolitical_zone in ('North Central','North East','North West','South East','South South','South West'))
  ),
  constraint viewing_centre_address_length check (length(btrim(exact_address)) between 3 and 500)
);

alter table public.viewing_centre_interests enable row level security;
revoke all on table public.viewing_centre_interests from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (host_name, contact, email, location_scope, country, geopolitical_zone, exact_address)
  on table public.viewing_centre_interests to anon;
grant select on table public.viewing_centre_interests to authenticated;
drop policy if exists "Public can submit viewing-centre interest" on public.viewing_centre_interests;
create policy "Public can submit viewing-centre interest"
  on public.viewing_centre_interests for insert to anon with check (true);
drop policy if exists "Secretariat can read viewing-centre interest" on public.viewing_centre_interests;
create policy "Secretariat can read viewing-centre interest"
  on public.viewing_centre_interests for select to authenticated
  using (exists (select 1 from public.team_access where user_id = (select auth.uid()) and team = 'secretariat'));
drop policy if exists "Restrict viewing-centre responses to Secretariat" on public.viewing_centre_interests;
create policy "Restrict viewing-centre responses to Secretariat"
  on public.viewing_centre_interests as restrictive for select to authenticated
  using (exists (select 1 from public.team_access where user_id = (select auth.uid()) and team = 'secretariat'));

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  category text not null,
  cover_image text,
  cover_alt text,
  body text not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_title_length check (length(btrim(title)) between 1 and 180),
  constraint blog_posts_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 180),
  constraint blog_posts_excerpt_length check (length(btrim(excerpt)) between 1 and 400),
  constraint blog_posts_category_length check (length(btrim(category)) between 1 and 60),
  constraint blog_posts_body_length check (length(btrim(body)) between 1 and 100000),
  constraint blog_posts_status_valid check (status in ('draft', 'published')),
  constraint blog_posts_published_time check (status <> 'published' or published_at is not null)
);

alter table public.blog_posts alter column author_id drop not null;
alter table public.blog_posts add column if not exists cover_alt text;

alter table public.blog_posts enable row level security;
revoke all on table public.blog_posts from public, anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;
grant insert, update, delete on table public.blog_posts to authenticated;
drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts" on public.blog_posts
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Writers can manage blog posts" on public.blog_posts;
create policy "Writers can manage blog posts" on public.blog_posts
  for all to authenticated
  using (exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat')))
  with check (exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ymr-blog-media', 'ymr-blog-media', true, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Public can view YMR journal media" on storage.objects;
create policy "Public can view YMR journal media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'ymr-blog-media');
drop policy if exists "Writers can upload YMR journal media" on storage.objects;
create policy "Writers can upload YMR journal media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ymr-blog-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat'))
  );
drop policy if exists "Writers can update YMR journal media" on storage.objects;
create policy "Writers can update YMR journal media" on storage.objects
  for update to authenticated using (
    bucket_id = 'ymr-blog-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat'))
  ) with check (
    bucket_id = 'ymr-blog-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat'))
  );
drop policy if exists "Writers can delete YMR journal media" on storage.objects;
create policy "Writers can delete YMR journal media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'ymr-blog-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.team_access where user_id = (select auth.uid()) and team in ('writer','secretariat'))
  );

comment on table public.viewing_centre_interests is 'Private watch-party host interest submissions; public API access is insert-only.';
comment on table public.blog_posts is 'YMR Journal posts; public reads are limited to published posts, writer team accounts manage content.';


-- Seed the first three YMR Global stories. They are published immediately and
-- remain editable from /blog/manage after a writer account is configured.
insert into public.blog_posts (author_id, title, slug, excerpt, category, cover_image, cover_alt, body, status, published_at)
values
(null, 'YMR Global: Introducing The Vision', 'ymr-global-introducing-the-vision', 'From a gathering of young ministers to a generation carrying the presence of Jesus into every sphere, discover the vision behind YMR Global.', 'The YMR Story', '/images/gallery/ymr-2017/ymr-2017-02.jpg', 'Young ministers gathered in worship at the first YMR retreat in 2017', $article1$
YMR began in 2017 with a simple, urgent desire: see young ministers encounter God and carry that encounter into their communities. The first retreat welcomed more than 700 people from over 24 denominations. What started as a gathering quickly became a shared assignment.

![Young people gathered in worship at YMR](/images/retreat/gathering-wide.jpg)

## A generation on fire

The vision is often expressed in three words: **Raising a Burning Generation.** YMR exists to raise, build and equip people to serve as Kingdom ambassadors in every sphere of human influence. It is a call to wholehearted faith that reaches beyond a conference room into homes, campuses, workplaces and cities.

In 2018, Pastor Daniel Olawande described a vision of people emerging like giants from fire: burning, yet not consumed. That image captured the heart of the retreat—a people formed by the presence of God, ready to live with courage, character and conviction.

Each year, prayer, worship and the teaching of Scripture sit alongside practical conversations about leadership, work, creativity and influence. The aim is not simply a memorable few days; it is a life that keeps bearing fruit after the gathering ends.

YMR Global is now preparing for its tenth Nigerian edition, **City Takers**, December 26–30, 2026. There is a place for you in this story.

[Register for YMR 2026](/register)

$article1$, 'published', '2026-11-20T09:00:00Z'),
(null, '10 Years of Revival: YMR Over The Years', '10-years-of-revival-ymr-over-the-years', 'A look at the turning points, annual themes and growing community that have shaped YMR from its first retreat to its tenth edition.', 'Milestones', '/images/gallery/ymr-2024/ymr-2024-teaching.webp', 'A speaker teaches a gathering of young people at YMR 2024', $article2$
Ten years is more than a number. It is a record of answered prayers, new beginnings and a generation learning to carry revival into everyday life.

![A moment from YMR worship](/images/gallery/ymr-2024/ymr-2024-worship.webp)

## From one retreat to a movement

**2017 — The beginning.** The first Young Ministers Retreat gathered more than 700 people representing over 24 denominations. A vision to raise a burning generation found a community ready to run with it.

**2018 — A defining picture.** The “burning generation” vision took shape as a call to be transformed by God’s presence and sent into the world with purpose.

**2020 — A wider reach.** Even as the gathering reached people online, the annual retreat continued to grow. YMR’s historical report records more than 19,000 on-site participants and a digital reach above two million that year.

**2021–2025 — A generation equipped.** Each edition carried a distinct theme: *Weapons of War*, *Witnesses*, *The Rain*, *Floodgates* and *The New Army*. Alongside worship and teaching, the work expanded into practical development, including the Witness Club and opportunities for young entrepreneurs.

![The New Army, YMR 2025](/images/editions/ymr-2025-the-new-army.jpeg)

Now comes **City Takers**: the tenth Nigerian edition, December 26–30, 2026. The milestone points forward—to cities reached, leaders raised and faith put into action.

[Register for the 10th edition of YMR](/register)

$article2$, 'published', '2026-11-20T09:05:00Z'),
(null, 'Impact, Testimonies and Stories of Faith', 'impact-testimonies-and-stories-of-faith', 'The truest measure of a retreat is what people carry home: renewed faith, a clearer calling and courage to serve others.', 'Stories of Faith', '/images/gallery/ymr-2025/ymr-2025-stage.webp', 'A woman worships with her hands raised at YMR 2025', $article3$
A gathering ends. The work God begins in people continues.

![A community gathered in worship at YMR](/images/gallery/ymr-2025/ymr-2025-worship.webp)

Across YMR editions, people have shared stories of renewed faith, answered prayer and fresh direction. One public testimony tells of a scholarship interview invitation arriving as its author travelled to the 2023 retreat; that journey later led to a fully funded PhD in the United States. Others describe finding the courage to serve, returning to prayer with new conviction, or discovering a community that helped them keep going.

These stories are personal, but their impact reaches outward. Through the **Witness Club**, young people are encouraged to share their faith and serve in their communities. **Youth Aflame** creates space for practical growth, while **YMR Samaritan** reflects a commitment to care and support. Together, they show that revival can shape both the inner life and the way we treat our neighbours.

We share testimonies with gratitude, never as a promise that every story will look the same. They are reminders of lives being changed and an invitation to keep believing, serving and making room for others.

The next chapter begins at **City Takers**, YMR’s tenth Nigerian edition, December 26–30, 2026. Come ready to worship, grow and bring your faith into your city.

[Register for YMR 2026](/register) · [Read more testimonies](/testimonies)

$article3$, 'published', '2026-11-20T09:10:00Z')
on conflict (slug) do update set cover_image = excluded.cover_image, cover_alt = excluded.cover_alt, updated_at = now();
