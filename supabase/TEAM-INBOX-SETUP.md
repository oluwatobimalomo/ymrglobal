# Private team inbox setup

The team pages are `/team/prayer` and `/team/testimonies`. The pages require a Supabase Auth account, and database row-level security separately limits prayer data to prayer-team accounts and testimony data to testimony-team accounts. Knowing the URL alone does not grant access.

## One-time setup

1. In the Supabase SQL Editor, run `schema.sql` if it has not already been applied, then run `team-inbox-access.sql`.
2. In Supabase Dashboard → Authentication → Users, create one Auth user per staff member. Do not enable public sign-ups for this purpose. Give each person an individual account rather than sharing credentials.
3. Copy each account's UUID from the Users list.
4. In the SQL Editor, assign each person to only the relevant team. Replace the example UUIDs before running:

```sql
insert into public.team_access (user_id, team)
values
  ('00000000-0000-0000-0000-000000000001', 'prayer'),
  ('00000000-0000-0000-0000-000000000002', 'testimony');
```

If one person serves both teams, add two rows with the same user UUID and the two different team values. To remove access, delete that person's row (or rows):

```sql
delete from public.team_access
where user_id = '00000000-0000-0000-0000-000000000001';
```

5. Build and deploy the site so the new routes are available. Sign-in URLs are `/team/prayer` and `/team/testimonies`.

## Using the inboxes

Team members sign in with their assigned email and password. They can review the latest 100 submissions in the page and use **Download all as CSV** to export every record they are authorized to see. Sign out when finished, especially on a shared device.

The pages include `noindex` metadata, but that only discourages search indexing. The actual protection is Supabase Auth plus row-level security. Keep the `team_access` table limited to authorized administrators; do not grant staff write access to it or to the submission tables.
