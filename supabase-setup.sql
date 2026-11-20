-- ORBIT + Supabase setup (paste into Supabase SQL Editor and Run).
-- Create a NEW Supabase project first, enable email confirmation, and configure your Site URL to the Render website.
-- Security note: registered usernames are discoverable only when opted in. Email addresses are NOT in profiles.
-- Shared messages and private messages are protected with Row Level Security.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 24),
  discoverable boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.general_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  nickname text not null default 'ORBIT +',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create table if not exists public.blocks (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, blocked_id),
  check (owner_id <> blocked_id)
);
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists general_messages_created_idx on public.general_messages (created_at desc);
create index if not exists direct_messages_sender_recipient_idx on public.direct_messages (sender_id,recipient_id,created_at);
create index if not exists direct_messages_recipient_sender_idx on public.direct_messages (recipient_id,sender_id,created_at);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id);

alter table public.profiles enable row level security;
alter table public.general_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.direct_messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Profiles: only opted-in people show up in the directory. User can always see own profile.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (discoverable = true or id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- General messages can be read by logged-in members; only signed-in authors can send.
drop policy if exists "general_read" on public.general_messages;
create policy "general_read" on public.general_messages for select to authenticated using (true);
drop policy if exists "general_send" on public.general_messages;
create policy "general_send" on public.general_messages for insert to authenticated with check (sender_id = (select auth.uid()));
-- Announcements are read-only for members. Add announcements as the project owner using SQL Editor.
drop policy if exists "announcements_read" on public.announcements;
create policy "announcements_read" on public.announcements for select to authenticated using (true);

-- Blocking is private to whoever created the block.
drop policy if exists "blocks_read_own" on public.blocks;
create policy "blocks_read_own" on public.blocks for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete to authenticated using (owner_id = (select auth.uid()));

-- Read private messages only when logged in as the sender or recipient.
drop policy if exists "dm_participants_read" on public.direct_messages;
create policy "dm_participants_read" on public.direct_messages for select to authenticated using
(sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists "dm_sender_insert" on public.direct_messages;
create policy "dm_sender_insert" on public.direct_messages for insert to authenticated with check (
 sender_id = (select auth.uid())
 and exists (select 1 from public.profiles p where p.id = recipient_id and p.discoverable = true)
 and not exists (select 1 from public.blocks b where
    (b.owner_id = sender_id and b.blocked_id = recipient_id)
    or (b.owner_id = recipient_id and b.blocked_id = sender_id))
);
-- Note: RLS blocks_read_own would hide recipient's blocks from the sender,
-- so the above cross-user check needs a security-definer helper to enforce both directions.
create or replace function public.dm_allowed(s uuid,r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select not exists (
   select 1 from public.blocks b where
   (b.owner_id = s and b.blocked_id = r) or (b.owner_id = r and b.blocked_id = s)
 );
$$;
revoke all on function public.dm_allowed(uuid,uuid) from public;
grant execute on function public.dm_allowed(uuid,uuid) to authenticated;
drop policy if exists "dm_sender_insert" on public.direct_messages;
create policy "dm_sender_insert" on public.direct_messages for insert to authenticated with check (
 sender_id = (select auth.uid())
 and exists (select 1 from public.profiles p where p.id = recipient_id and p.discoverable = true)
 and public.dm_allowed(sender_id, recipient_id)
);
-- Prevent spoofing the display name: always resolve it from the authenticated sender's profile.
create or replace function public.use_author_nickname()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 select p.nickname into new.nickname from public.profiles p where p.id = new.sender_id;
 if new.nickname is null then raise exception 'Sender profile missing'; end if;
 return new;
end;
$$;
drop trigger if exists set_general_nickname on public.general_messages;
create trigger set_general_nickname before insert on public.general_messages for each row execute function public.use_author_nickname();
drop trigger if exists set_dm_nickname on public.direct_messages;
create trigger set_dm_nickname before insert on public.direct_messages for each row execute function public.use_author_nickname();

-- Users may submit reports; only the project admin can read them through the Supabase Dashboard.
drop policy if exists "reports_submit" on public.reports;
create policy "reports_submit" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
-- Seed announcement, which will be visible after sign-in.
insert into public.announcements(nickname,body)
select 'ORBIT +','Welcome to ORBIT +! General chat and direct messages are open to registered members.'
where not exists (select 1 from public.announcements);

-- Test with two separate registered accounts in different browsers.
-- For production with minors: set up moderation, review reports regularly, limit membership,
-- and consider requiring administrator approval before opening registration widely.
