-- NovaShop administrator bootstrap
-- Run this ONCE in Supabase SQL Editor as the project owner.
-- Never put a service-role key or database password in frontend code.

begin;

-- Create the administrator allow-list if it does not already exist.
create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- The browser must be able to check its own administrator membership,
-- but normal users must never be able to insert themselves.
alter table public.admin_users enable row level security;

-- Re-create only the safe read policy. No INSERT/UPDATE/DELETE policy is
-- granted to authenticated users, so the browser cannot promote itself.
drop policy if exists "admins_can_read_own_membership" on public.admin_users;
create policy "admins_can_read_own_membership"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

commit;

-- ================================================================
-- FIRST ADMIN: replace the email below with the email of the account
-- that you want to make the first administrator, then run this block.
-- This is intentionally performed in the Supabase SQL Editor rather
-- than from the public website.
-- ================================================================

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('REPLACE-WITH-YOUR-ADMIN-EMAIL@example.com')
and not exists (select 1 from public.admin_users)
limit 1;

-- Verify the result:
select au.user_id, au.created_at, u.email
from public.admin_users au
join auth.users u on u.id = au.user_id;

-- SECURITY NOTE:
-- The NOT EXISTS condition means this bootstrap statement cannot add a
-- second administrator once the first row exists. Additional admins should
-- be added deliberately by the project owner in Supabase SQL Editor, e.g.:
-- insert into public.admin_users (user_id)
-- select id from auth.users where lower(email)=lower('SECOND-ADMIN@example.com');
