-- ORBIT + free personalization, based on the original Orbit avatar rings,
-- name fonts and home themes. No coins, payment or purchase records.
create table if not exists public.orbit_appearance (
 user_id uuid primary key references auth.users(id) on delete cascade,
 home_theme text not null default 'classic' check(home_theme in ('classic','aurora','sunset','rose','arctic','midnight','nebula')),
 avatar_style text not null default 'planet' check(avatar_style in ('planet','moon','comet','star','aurora','galaxy')),
 avatar_ring text not null default 'orbit' check(avatar_ring in ('none','orbit','neon','solar','ice','royal')),
 name_font text not null default 'default' check(name_font in ('default','rounded','serif','mono','tech','hand')),
 avatar_path text not null default '' check(avatar_path='' or avatar_path = user_id::text || '/avatar.webp'),
 updated_at timestamptz not null default now()
);
alter table public.orbit_appearance enable row level security;
revoke all on table public.orbit_appearance from anon;
grant select,insert,update on table public.orbit_appearance to authenticated;
drop policy if exists orbit_appearance_read on public.orbit_appearance;
create policy orbit_appearance_read on public.orbit_appearance
for select to authenticated
using(private.orbit_is_member() and private.orbit_member_active(user_id));
drop policy if exists orbit_appearance_insert on public.orbit_appearance;
create policy orbit_appearance_insert on public.orbit_appearance
for insert to authenticated
with check(user_id=(select auth.uid()) and private.orbit_is_member());
drop policy if exists orbit_appearance_update on public.orbit_appearance;
create policy orbit_appearance_update on public.orbit_appearance
for update to authenticated
using(user_id=(select auth.uid()) and private.orbit_is_member())
with check(user_id=(select auth.uid()) and private.orbit_is_member());
create or replace function private.orbit_appearance_updated()
returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists orbit_appearance_updated_trigger on public.orbit_appearance;
create trigger orbit_appearance_updated_trigger
before update on public.orbit_appearance for each row
execute function private.orbit_appearance_updated();

-- Private photo uploads; students' photos are not permanently public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('orbit-member-avatars','orbit-member-avatars',false,1048576,array['image/webp'])
on conflict (id) do update set public=false,file_size_limit=1048576,allowed_mime_types=array['image/webp'];

drop policy if exists orbit_avatars_read on storage.objects;
create policy orbit_avatars_read on storage.objects for select to authenticated
using(bucket_id='orbit-member-avatars' and private.orbit_is_member());
drop policy if exists orbit_avatars_insert on storage.objects;
create policy orbit_avatars_insert on storage.objects for insert to authenticated
with check(
 bucket_id='orbit-member-avatars'
 and name=(select auth.uid())::text || '/avatar.webp'
 and private.orbit_is_member()
);
drop policy if exists orbit_avatars_update on storage.objects;
create policy orbit_avatars_update on storage.objects for update to authenticated
using(bucket_id='orbit-member-avatars'
 and name=(select auth.uid())::text || '/avatar.webp'
 and private.orbit_is_member())
with check(bucket_id='orbit-member-avatars'
 and name=(select auth.uid())::text || '/avatar.webp'
 and private.orbit_is_member());
drop policy if exists orbit_avatars_delete on storage.objects;
create policy orbit_avatars_delete on storage.objects for delete to authenticated
using(bucket_id='orbit-member-avatars'
 and name=(select auth.uid())::text || '/avatar.webp'
 and private.orbit_is_member());
