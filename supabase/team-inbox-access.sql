-- Private team inbox access for prayer requests and testimony submissions.
-- Run in the Supabase SQL Editor after schema.sql.
-- Create each team member as an Auth user, then add their UUID to this table.

create table if not exists public.team_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  team text not null check (team in ('prayer', 'testimony')),
  created_at timestamptz not null default now(),
  primary key (user_id, team)
);

alter table public.team_access enable row level security;
revoke all on table public.team_access from public, anon, authenticated;
grant select on table public.team_access to authenticated;

drop policy if exists "Team members can view their own access" on public.team_access;
create policy "Team members can view their own access"
  on public.team_access
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Restrictive policies remain in force even if a broader permissive policy is
-- added to these tables later. This prevents policy OR-composition from
-- accidentally widening staff access.
drop policy if exists "Restrict team access rows to the current user" on public.team_access;
create policy "Restrict team access rows to the current user"
  on public.team_access
  as restrictive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
alter table public.prayer_requests enable row level security;
alter table public.testimony_submissions enable row level security;
grant select on table public.prayer_requests to authenticated;
grant select on table public.testimony_submissions to authenticated;

drop policy if exists "Prayer team can read prayer requests" on public.prayer_requests;
create policy "Prayer team can read prayer requests"
  on public.prayer_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_access
      where team_access.user_id = (select auth.uid())
        and team_access.team = 'prayer'
    )
  );

drop policy if exists "Restrict prayer requests to prayer team" on public.prayer_requests;
create policy "Restrict prayer requests to prayer team"
  on public.prayer_requests
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_access
      where team_access.user_id = (select auth.uid())
        and team_access.team = 'prayer'
    )
  );

drop policy if exists "Testimony team can read testimonies" on public.testimony_submissions;
create policy "Testimony team can read testimonies"
  on public.testimony_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_access
      where team_access.user_id = (select auth.uid())
        and team_access.team = 'testimony'
    )
  );

drop policy if exists "Restrict testimonies to testimony team" on public.testimony_submissions;
create policy "Restrict testimonies to testimony team"
  on public.testimony_submissions
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.team_access
      where team_access.user_id = (select auth.uid())
        and team_access.team = 'testimony'
    )
  );

comment on table public.team_access is
  'Private mapping of Supabase Auth users to YMR internal teams. Maintain through the Supabase SQL Editor.';
