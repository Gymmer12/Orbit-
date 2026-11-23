-- ORBIT + membership approval with private applicant/admin verification chats.
-- To designate the owner, follow ADMIN-APPROVAL-SETUP.md. Never auto-promote first signup.
create table if not exists public.orbit_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.orbit_applications (
 user_id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null check(char_length(first_name) between 1 and 40),
 last_name text not null check(char_length(last_name) between 1 and 40),
 nickname text not null check(char_length(nickname) between 2 and 24),
 school_email text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists orbit_applications_status_idx on public.orbit_applications(status,created_at);
create table if not exists public.orbit_verification_messages (
 id bigint generated always as identity primary key,
 applicant_id uuid not null references public.orbit_applications(user_id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 600),
 created_at timestamptz not null default now()
);
create index if not exists orbit_verification_msgs_idx on public.orbit_verification_messages(applicant_id,created_at);

alter table public.orbit_admins enable row level security;
alter table public.orbit_applications enable row level security;
alter table public.orbit_verification_messages enable row level security;

revoke all on table public.orbit_admins,public.orbit_applications,public.orbit_verification_messages from anon;
grant select on public.orbit_admins to authenticated;
grant select,insert,update on public.orbit_applications to authenticated;
grant select,insert on public.orbit_verification_messages to authenticated;
grant usage,select on sequence public.orbit_verification_messages_id_seq to authenticated;

drop policy if exists orbit_admins_read_self on public.orbit_admins;
create policy orbit_admins_read_self on public.orbit_admins for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists orbit_applications_read on public.orbit_applications;
create policy orbit_applications_read on public.orbit_applications for select to authenticated
using(user_id=(select auth.uid()) or exists (select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));
drop policy if exists orbit_applications_signup on public.orbit_applications;
create policy orbit_applications_signup on public.orbit_applications for insert to authenticated
with check(
 user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null
 and lower(school_email)=lower(coalesce((select auth.jwt()->>'email'),''))
 and school_email ~* '^[0-9]{2}[a-z]{2,}@tesdk12[.]net$'
);
drop policy if exists orbit_applications_admin_review on public.orbit_applications;
create policy orbit_applications_admin_review on public.orbit_applications for update to authenticated
using(exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())))
with check(exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));

drop policy if exists orbit_verification_read on public.orbit_verification_messages;
create policy orbit_verification_read on public.orbit_verification_messages for select to authenticated
using(applicant_id=(select auth.uid()) or exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));
drop policy if exists orbit_verification_write on public.orbit_verification_messages;
create policy orbit_verification_write on public.orbit_verification_messages for insert to authenticated
with check(
 sender_id=(select auth.uid())
 and (applicant_id=(select auth.uid()) or exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())))
);
-- These helpers are security-invoker and read only applicant's own status or admin's own entry.
create or replace function private.orbit_is_member()
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
 or exists(select 1 from public.orbit_applications m where m.user_id=(select auth.uid()) and m.status='approved')
$$;
revoke all on function private.orbit_is_member() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.orbit_is_member() to authenticated;

-- Protect regular site content at the DATABASE layer, not just behind the UI.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(
 private.orbit_is_member() and (discoverable or id=(select auth.uid()))
);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
with check(id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using(id=(select auth.uid()) and private.orbit_is_member())
with check(id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists general_read on public.general_messages;
create policy general_read on public.general_messages for select to authenticated
using(private.orbit_is_member());
drop policy if exists general_send on public.general_messages;
create policy general_send on public.general_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated
using(private.orbit_is_member());
drop policy if exists dm_participants_read on public.direct_messages;
create policy dm_participants_read on public.direct_messages for select to authenticated
using(private.orbit_is_member() and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid())));
drop policy if exists dm_sender_insert on public.direct_messages;
create policy dm_sender_insert on public.direct_messages for insert to authenticated
with check(
 sender_id=(select auth.uid()) and private.orbit_is_member()
 and exists(select 1 from public.profiles p where p.id=recipient_id and p.discoverable=true)
 and private.dm_allowed(sender_id,recipient_id)
);
drop policy if exists blocks_read_own on public.blocks;
create policy blocks_read_own on public.blocks for select to authenticated
using(owner_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks for insert to authenticated
with check(owner_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks for delete to authenticated
using(owner_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists reports_submit on public.reports;
create policy reports_submit on public.reports for insert to authenticated
with check(reporter_id=(select auth.uid()) and private.orbit_is_member());
