# Private team inbox setup

Prayer and testimony teams use `/team/prayer` and `/team/testimonies`. Secretariat staff use `/secretariat` and `/secretariat/inbox`. Every page requires an individual Supabase Auth account, and database row-level security separately limits each dataset to its assigned team. Knowing a URL alone does not grant access.

## One-time setup

1. In the Supabase SQL Editor, run `schema.sql` if it has not already been applied, then run `registration-forms.sql`, `delegate-registration.sql`, `team-inbox-access.sql`, and finally `secretariat-access.sql`. The final migration preserves public insert-only registration submissions while giving Secretariat members read access to the three registration tables.
2. In Supabase Dashboard → Authentication → Users, create one Auth user per staff member. Do not enable public sign-ups for this purpose. Give each person an individual account rather than sharing credentials.
3. Copy each account's UUID from the Users list.
4. In the SQL Editor, assign each person to the appropriate team(s). Replace the example UUIDs before running:

```sql
insert into public.team_access (user_id, team)
values
  ('00000000-0000-0000-0000-000000000001', 'prayer'),
  ('00000000-0000-0000-0000-000000000002', 'testimony'),
  ('00000000-0000-0000-0000-000000000003', 'secretariat');
```

If one person serves more than one team, add a row for each team using the same user UUID. To remove access, delete that person's row (or rows):

```sql
delete from public.team_access
where user_id = '00000000-0000-0000-0000-000000000001';
```

5. Build and deploy the site so the routes are available. Sign-in URLs are `/team/prayer`, `/team/testimonies`, and `/secretariat`.

## Using the inboxes

Team members sign in with their assigned email and password. Prayer and testimony inboxes support text search, category and date filters, plus testimony status filtering. The Secretariat inbox uses tabs to switch among pastor, campus leader, and delegate registrations, with text search and received-date filters. Each inbox supports selecting individual records or all records matching the current filters, then downloading selected records or all matching records as CSV. Search and filters run in the browser after authorized records are fetched.

Do not use shared fixed credentials. Individual Supabase Auth accounts let administrators remove access for one person without changing everyone else's credentials. Sign out when finished, especially on a shared device. If a session expires, the inbox clears loaded records and asks the user to sign in again.

The pages include `noindex` metadata, but that only discourages search indexing. The actual protection is Supabase Auth plus row-level security. Keep the `team_access` table limited to authorized administrators; do not grant staff write access to it or to the submission tables.
