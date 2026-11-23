-- ORBIT + member settings, based on Alan's original profile settings.
-- Only approved members may edit their own profiles, under existing RLS.
-- Public profile status/bio are visible only to approved members.
alter table public.profiles
 add column if not exists member_status text not null default 'online',
 add column if not exists custom_status text not null default '',
 add column if not exists bio text not null default '',
 add column if not exists avatar_color text not null default '#416ECB';

alter table public.profiles drop constraint if exists orbit_profile_status_allowed;
alter table public.profiles
 add constraint orbit_profile_status_allowed
 check(member_status in ('online','idle','dnd','invisible'));
alter table public.profiles drop constraint if exists orbit_profile_custom_status_length;
alter table public.profiles
 add constraint orbit_profile_custom_status_length
 check(char_length(custom_status)<=80);
alter table public.profiles drop constraint if exists orbit_profile_bio_length;
alter table public.profiles
 add constraint orbit_profile_bio_length
 check(char_length(bio)<=190);
alter table public.profiles drop constraint if exists orbit_profile_avatar_color_hex;
alter table public.profiles
 add constraint orbit_profile_avatar_color_hex
 check(avatar_color ~ '^#[0-9A-Fa-f]{6}$');

-- Trigger also applies existing profanity rule to new public profile text.
create or replace function private.orbit_profile_settings_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if private.orbit_has_bad_words(new.custom_status)
    or private.orbit_has_bad_words(new.bio) then
   raise exception 'Inappropriate language is not allowed in your profile.'
     using errcode='P0001';
 end if;
 return new;
end;
$$;
drop trigger if exists orbit_profile_settings_guard_trigger on public.profiles;
create trigger orbit_profile_settings_guard_trigger
before insert or update on public.profiles
for each row execute function private.orbit_profile_settings_guard();

-- Private settings are NOT in public.profiles or the member list.
create table if not exists public.orbit_member_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 notify_dms boolean not null default false,
 notify_all_chat boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.orbit_member_preferences enable row level security;
revoke all on public.orbit_member_preferences from anon;
grant select,insert,update on public.orbit_member_preferences to authenticated;
drop policy if exists orbit_preferences_read_own on public.orbit_member_preferences;
create policy orbit_preferences_read_own on public.orbit_member_preferences
for select to authenticated
using(user_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists orbit_preferences_insert_own on public.orbit_member_preferences;
create policy orbit_preferences_insert_own on public.orbit_member_preferences
for insert to authenticated
with check(user_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists orbit_preferences_update_own on public.orbit_member_preferences;
create policy orbit_preferences_update_own on public.orbit_member_preferences
for update to authenticated
using(user_id=(select auth.uid()) and private.orbit_is_member())
with check(user_id=(select auth.uid()) and private.orbit_is_member());

create or replace function private.orbit_member_preferences_updated()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now();return new;end;
$$;
drop trigger if exists orbit_member_preferences_stamp on public.orbit_member_preferences;
create trigger orbit_member_preferences_stamp before update on public.orbit_member_preferences
for each row execute function private.orbit_member_preferences_updated();
