-- ORBIT + messaging update.
-- Approved member directory, server-checked staff roles, editable announcements and online presence.
-- Safe to rerun; existing messages and memberships are retained.

create or replace function private.orbit_member_active(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and (
  exists (select 1 from public.orbit_admins a where a.user_id = p_user_id)
  or exists (select 1 from public.orbit_applications o where o.user_id = p_user_id and o.status = 'approved')
 );
$$;
revoke all on function private.orbit_member_active(uuid) from public, anon;
grant execute on function private.orbit_member_active(uuid) to authenticated;

create table if not exists public.orbit_moderators (
 user_id uuid primary key references auth.users(id) on delete cascade,
 assigned_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.orbit_moderators enable row level security;
revoke all on public.orbit_moderators from anon;
grant select, insert, delete on public.orbit_moderators to authenticated;
drop policy if exists orbit_mod_read on public.orbit_moderators;
create policy orbit_mod_read on public.orbit_moderators
for select to authenticated using (private.orbit_is_member());
drop policy if exists orbit_mod_assign on public.orbit_moderators;
create policy orbit_mod_assign on public.orbit_moderators
for insert to authenticated
with check (
 assigned_by = (select auth.uid())
 and exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
 and private.orbit_member_active(user_id)
);
drop policy if exists orbit_mod_revoke on public.orbit_moderators;
create policy orbit_mod_revoke on public.orbit_moderators
for delete to authenticated
using (exists (select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));

create or replace function private.orbit_staff()
returns boolean language sql stable security invoker set search_path = '' as $$
 select (select auth.uid()) is not null and private.orbit_is_member() and (
  exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
  or exists(select 1 from public.orbit_moderators m where m.user_id=(select auth.uid()))
 );
$$;
revoke all on function private.orbit_staff() from public, anon;
grant execute on function private.orbit_staff() to authenticated;

-- The directory lists only approved accounts and their public nicknames.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (private.orbit_is_member() and private.orbit_member_active(id));

-- DMs may be sent only to currently approved members who have a profile.
drop policy if exists dm_sender_insert on public.direct_messages;
create policy dm_sender_insert on public.direct_messages for insert to authenticated
with check (
 sender_id = (select auth.uid()) and private.orbit_is_member()
 and private.orbit_member_active(recipient_id)
 and exists(select 1 from public.profiles p where p.id=recipient_id)
 and private.dm_allowed(sender_id,recipient_id)
);

alter table public.announcements
 add column if not exists title text not null default 'Announcement',
 add column if not exists pinned boolean not null default false,
 add column if not exists author_id uuid references auth.users(id) on delete set null,
 add column if not exists updated_at timestamptz not null default now();
alter table public.announcements drop constraint if exists orbit_announcement_title_length;
alter table public.announcements
 add constraint orbit_announcement_title_length check (char_length(btrim(title)) between 1 and 120);
revoke all on public.announcements from anon;
grant select, insert, update, delete on public.announcements to authenticated;
grant usage, select on sequence public.announcements_id_seq to authenticated;
drop policy if exists orbit_announcements_staff_insert on public.announcements;
create policy orbit_announcements_staff_insert on public.announcements
for insert to authenticated with check (private.orbit_staff() and author_id=(select auth.uid()));
drop policy if exists orbit_announcements_staff_update on public.announcements;
create policy orbit_announcements_staff_update on public.announcements
for update to authenticated
using (private.orbit_staff()) with check (private.orbit_staff());
drop policy if exists orbit_announcements_admin_delete on public.announcements;
create policy orbit_announcements_admin_delete on public.announcements
for delete to authenticated
using (exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));

create or replace function private.orbit_announcement_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare display_name text;
begin
 if tg_op = 'INSERT' then
  new.author_id := (select auth.uid());
  select p.nickname into display_name from public.profiles p where p.id=(select auth.uid());
  new.nickname := coalesce(display_name,'ORBIT + Staff');
  new.created_at := now();
 else
  new.author_id := old.author_id;
  new.nickname := old.nickname;
  new.created_at := old.created_at;
 end if;
 new.title := btrim(coalesce(new.title,''));
 new.updated_at := now();
 return new;
end;
$$;
drop trigger if exists orbit_announcement_guard_write on public.announcements;
create trigger orbit_announcement_guard_write
before insert or update on public.announcements
for each row execute function private.orbit_announcement_guard();

-- Presence is a recent online signal (not an exact activity or location tracker).
create table if not exists public.orbit_presence (
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_seen timestamptz not null default now()
);
alter table public.orbit_presence enable row level security;
revoke all on public.orbit_presence from anon;
grant select, insert, update, delete on public.orbit_presence to authenticated;
drop policy if exists orbit_presence_read on public.orbit_presence;
create policy orbit_presence_read on public.orbit_presence for select to authenticated
using (private.orbit_is_member() and private.orbit_member_active(user_id));
drop policy if exists orbit_presence_insert on public.orbit_presence;
create policy orbit_presence_insert on public.orbit_presence for insert to authenticated
with check (user_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists orbit_presence_update on public.orbit_presence;
create policy orbit_presence_update on public.orbit_presence for update to authenticated
using (user_id=(select auth.uid()) and private.orbit_is_member())
with check (user_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists orbit_presence_delete on public.orbit_presence;
create policy orbit_presence_delete on public.orbit_presence for delete to authenticated
using (user_id=(select auth.uid()));

create or replace function private.orbit_presence_timestamp()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.last_seen := now();
 return new;
end;
$$;
drop trigger if exists orbit_presence_stamped on public.orbit_presence;
create trigger orbit_presence_stamped before insert or update on public.orbit_presence
for each row execute function private.orbit_presence_timestamp();
