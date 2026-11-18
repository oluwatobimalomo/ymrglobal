-- Give authorized Secretariat Auth users read-only access to registration submissions.
-- Run registration-forms.sql, delegate-registration.sql, and team-inbox-access.sql first.

alter table public.team_access drop constraint if exists team_access_team_check;
alter table public.team_access
  add constraint team_access_team_check check (team in ('prayer', 'testimony', 'secretariat'));

grant usage on schema public to authenticated;
grant select on table public.team_access to authenticated;

-- Public submitters retain insert-only access. Authenticated users can read only
-- when the signed-in user has a Secretariat membership row.
revoke all on table public.pastor_registrations from authenticated;
revoke all on table public.campus_leader_registrations from authenticated;
revoke all on table public.delegate_registrations from authenticated;
grant select on table public.pastor_registrations to authenticated;
grant select on table public.campus_leader_registrations to authenticated;
grant select on table public.delegate_registrations to authenticated;

drop policy if exists "Secretariat can read pastor registrations" on public.pastor_registrations;
create policy "Secretariat can read pastor registrations"
  on public.pastor_registrations for select to authenticated
  using (exists (
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));
drop policy if exists "Restrict pastor registrations to Secretariat" on public.pastor_registrations;
create policy "Restrict pastor registrations to Secretariat"
  on public.pastor_registrations as restrictive for select to authenticated
  using (exists (
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));

drop policy if exists "Secretariat can read campus registrations" on public.campus_leader_registrations;
create policy "Secretariat can read campus registrations"
  on public.campus_leader_registrations for select to authenticated
  using (exists (
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));
drop policy if exists "Restrict campus registrations to Secretariat" on public.campus_leader_registrations;
create policy "Restrict campus registrations to Secretariat"
  on public.campus_leader_registrations as restrictive for select to authenticated
  using (exists (impl
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));

drop policy if exists "Secretariat can read delegate registrations" on public.delegate_registrations;
create policy "Secretariat can read delegate registrations"
  on public.delegate_registrations for select to authenticated
  using (exists (
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));
drop policy if exists "Restrict delegate registrations to Secretariat" on public.delegate_registrations;
create policy "Restrict delegate registrations to Secretariat"
  on public.delegate_registrations as restrictive for select to authenticated
  using (exists (
    select 1 from public.team_access
    where team_access.user_id = (select auth.uid()) and team_access.team = 'secretariat'
  ));

comment on table public.team_access is
  'Private mapping of Supabase Auth users to YMR internal teams, including Secretariat registration access.';
