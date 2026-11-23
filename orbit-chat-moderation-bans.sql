-- ORBIT + text moderation and administrator bans.
-- Applies to new/edited messages, announcement titles, and public nicknames.
-- Admins cannot ban themselves or another administrator. A ban blocks all shared
-- chat and direct messages at the database layer and stops applicant verification chat.

create table if not exists public.orbit_bans (
 user_id uuid primary key references auth.users(id) on delete cascade,
 banned_by uuid not null references auth.users(id),
 reason text not null default 'Violation of ORBIT + rules' check (char_length(reason) between 1 and 220),
 created_at timestamptz not null default now(),
 check (user_id <> banned_by)
);
alter table public.orbit_bans enable row level security;
revoke all on public.orbit_bans from anon;
grant select, insert, delete on public.orbit_bans to authenticated;

drop policy if exists orbit_ban_read on public.orbit_bans;
create policy orbit_ban_read on public.orbit_bans for select to authenticated
using (
 user_id = (select auth.uid())
 or exists (select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
);
drop policy if exists orbit_ban_admin_add on public.orbit_bans;
create policy orbit_ban_admin_add on public.orbit_bans for insert to authenticated
with check (
 banned_by=(select auth.uid())
 and exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
 and not exists(select 1 from public.orbit_admins protected where protected.user_id=orbit_bans.user_id)
);
drop policy if exists orbit_ban_admin_remove on public.orbit_bans;
create policy orbit_ban_admin_remove on public.orbit_bans for delete to authenticated
using(exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid())));

-- Used by existing RLS policies for chat, presence, moderators, profiles, and announcements.
create or replace function private.orbit_is_member()
returns boolean language sql stable security invoker set search_path = '' as $$
 select (select auth.uid()) is not null
 and not exists(select 1 from public.orbit_bans b where b.user_id=(select auth.uid()))
 and (
   exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
   or exists(select 1 from public.orbit_applications m
             where m.user_id=(select auth.uid()) and m.status='approved')
 );
$$;

-- The directory and direct-message permissions must exclude banned recipients.
create or replace function private.orbit_member_active(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null
 and not exists(select 1 from public.orbit_bans b where b.user_id=p_user_id)
 and (
   exists(select 1 from public.orbit_admins a where a.user_id=p_user_id)
   or exists(select 1 from public.orbit_applications m
             where m.user_id=p_user_id and m.status='approved')
 );
$$;
revoke all on function private.orbit_member_active(uuid) from public, anon;
grant execute on function private.orbit_member_active(uuid) to authenticated;

-- Ban restrictions also apply to the pending-account verification chat.
drop policy if exists orbit_verification_read on public.orbit_verification_messages;
create policy orbit_verification_read on public.orbit_verification_messages for select to authenticated
using(
 not exists(select 1 from public.orbit_bans b where b.user_id=(select auth.uid()))
 and (
  applicant_id=(select auth.uid())
  or exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
 )
);
drop policy if exists orbit_verification_write on public.orbit_verification_messages;
create policy orbit_verification_write on public.orbit_verification_messages for insert to authenticated
with check(
 sender_id=(select auth.uid())
 and not exists(select 1 from public.orbit_bans b where b.user_id=(select auth.uid()))
 and (
  applicant_id=(select auth.uid())
  or exists(select 1 from public.orbit_admins a where a.user_id=(select auth.uid()))
 )
);

-- Matching common profanity and abusive slurs, allowing for some
-- punctuation and numerical substitutions. Avoids substring false positives
-- such as 'class' or 'assignment' by using whole-word boundaries.
create or replace function private.orbit_has_bad_words(p_text text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
 normalized text;
 obfuscated text;
begin
 normalized := pg_catalog.regexp_replace(
  pg_catalog.translate(pg_catalog.lower(coalesce(p_text,'')), '01345@$!', 'oieasasi'),
  '[^a-z]+',' ','g'
 );
 -- Simple whole-word profanity/slur list; extend this list for site-specific needs.
 if normalized ~ '\m(fuck[a-z]*|motherfuck[a-z]*|shit[a-z]*|bullshit|bitch[a-z]*|ass|asshole[a-z]*|dumbass[a-z]*|bastard[a-z]*|slut[a-z]*|whore[a-z]*|cunt[a-z]*|dick[a-z]*|piss[a-z]*|crap[a-z]*|damn[a-z]*|nigg[a-z]*|faggot[a-z]*|retard[a-z]*)\M' then
  return true;
 end if;
 -- Catch deliberately spaced/punctuated spellings of frequently abused words.
 obfuscated := pg_catalog.translate(pg_catalog.lower(coalesce(p_text,'')), '01345@$!', 'oieasasi');
 if obfuscated ~ '\m(f[^a-z0-9]*u[^a-z0-9]*c[^a-z0-9]*k|s[^a-z0-9]*h[^a-z0-9]*i[^a-z0-9]*t|b[^a-z0-9]*i[^a-z0-9]*t[^a-z0-9]*c[^a-z0-9]*h|n[^a-z0-9]*i[^a-z0-9]*g[^a-z0-9]*g[^a-z0-9]*a)\M' then
  return true;
 end if;
 return false;
end;
$$;
revoke all on function private.orbit_has_bad_words(text) from public, anon;
grant execute on function private.orbit_has_bad_words(text) to authenticated;

create or replace function private.orbit_moderate_text()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if tg_table_name='announcements' then
   if private.orbit_has_bad_words(new.title) or private.orbit_has_bad_words(new.body) then
     raise exception 'Inappropriate language is not allowed. Please rewrite your announcement.' using errcode='P0001';
   end if;
 elsif tg_table_name in ('profiles','orbit_applications') then
   if private.orbit_has_bad_words(new.nickname) then
     raise exception 'That nickname is not allowed. Please choose another.' using errcode='P0001';
   end if;
 elsif private.orbit_has_bad_words(new.body) then
   raise exception 'Inappropriate language is not allowed. Please rewrite your message.' using errcode='P0001';
 end if;
 return new;
end;
$$;
drop trigger if exists orbit_filter_general on public.general_messages;
create trigger orbit_filter_general before insert or update on public.general_messages
for each row execute function private.orbit_moderate_text();
drop trigger if exists orbit_filter_direct on public.direct_messages;
create trigger orbit_filter_direct before insert or update on public.direct_messages
for each row execute function private.orbit_moderate_text();
drop trigger if exists orbit_filter_verification on public.orbit_verification_messages;
create trigger orbit_filter_verification before insert or update on public.orbit_verification_messages
for each row execute function private.orbit_moderate_text();
drop trigger if exists orbit_filter_announcements on public.announcements;
create trigger orbit_filter_announcements before insert or update on public.announcements
for each row execute function private.orbit_moderate_text();
drop trigger if exists orbit_filter_profiles on public.profiles;
create trigger orbit_filter_profiles before insert or update on public.profiles
for each row execute function private.orbit_moderate_text();
drop trigger if exists orbit_filter_applications on public.orbit_applications;
create trigger orbit_filter_applications before insert or update on public.orbit_applications
for each row execute function private.orbit_moderate_text();
