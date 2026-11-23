-- ORBIT+ Arcade: original text-friendly mini-games and a free, non-redeemable
-- score token called Stardust. Credits cannot be bought, transferred, or cashed out.
-- Rewards are computed on the server, with session, score, and daily limits.
create table if not exists public.orbit_game_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 game text not null check(game in ('tetris','snake','flappy')),
 score integer not null default 0 check(score between 0 and 250000),
 stardust integer not null default 0 check(stardust between 0 and 30),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 check(finished_at is null or finished_at>=started_at)
);
create index if not exists orbit_game_runs_user_started on public.orbit_game_runs(user_id,started_at desc);
create unique index if not exists orbit_game_runs_one_active_user
 on public.orbit_game_runs(user_id) where finished_at is null;
alter table public.orbit_game_runs enable row level security;
revoke all on public.orbit_game_runs from public,anon,authenticated;
grant select on public.orbit_game_runs to authenticated;
drop policy if exists orbit_runs_view_own on public.orbit_game_runs;
create policy orbit_runs_view_own on public.orbit_game_runs
 for select to authenticated using(user_id=(select auth.uid()) and private.orbit_is_member());

create or replace function public.orbit_start_game(p_game text)
returns uuid
language plpgsql security definer
set search_path=''
as $$
declare v_user uuid := (select auth.uid());v_run uuid;
begin
 if v_user is null or not private.orbit_is_member() then
   raise exception 'Only approved ORBIT+ members may play games.';
 end if;
 if p_game is null or p_game not in ('tetris','snake','flappy') then
   raise exception 'Unsupported game.';
 end if;
 -- Serializes starts/finishes for a single user without exposing writable scores.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,418));
 update public.orbit_game_runs set finished_at=now(),score=0,stardust=0
 where user_id=v_user and finished_at is null;
 insert into public.orbit_game_runs(user_id,game) values(v_user,p_game)
 returning id into v_run;
 return v_run;
end;
$$;
revoke all on function public.orbit_start_game(text) from public,anon;
grant execute on function public.orbit_start_game(text) to authenticated;

create or replace function public.orbit_finish_game(p_run_id uuid,p_score integer)
returns jsonb
language plpgsql security definer
set search_path=''
as $$
declare
 v_user uuid := (select auth.uid());
 v_run public.orbit_game_runs%rowtype;
 v_duration numeric;
 v_max_score integer;
 v_today integer;
 v_reward integer;
 v_awarded integer;
 v_total integer;
 v_best integer;
begin
 if v_user is null or not private.orbit_is_member() then
   raise exception 'Only approved ORBIT+ members may claim Stardust.';
 end if;
 if p_score is null or p_score<0 or p_score>250000 then
   raise exception 'Invalid score.';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,418));
 select * into v_run from public.orbit_game_runs
 where id=p_run_id and user_id=v_user for update;
 if not found then raise exception 'Game session not found.';end if;
 if v_run.finished_at is not null then raise exception 'This game was already finished.';end if;
 v_duration := extract(epoch from (now()-v_run.started_at));
 if v_duration<4 then
   -- A super-short run earns nothing, and is still marked completed.
   v_max_score:=0;
 elsif v_duration>1200 then
   -- Long/abandoned tabs get no rewards, though the local game can still be fun.
   v_max_score:=0;
 elsif v_run.game='tetris' then
   v_max_score:=least(12000,greatest(1000,pg_catalog.floor(v_duration*90)::integer));
 elsif v_run.game='snake' then
   v_max_score:=least(150,pg_catalog.floor(v_duration*3)::integer+3);
 else
   v_max_score:=least(150,pg_catalog.floor(v_duration*2)::integer+3);
 end if;
 -- Reject obviously implausible scores. Arcade scores are client-generated:
 -- this reduces trivial score spoofing, but does NOT make scores tamper-proof.
 if p_score>v_max_score then raise exception 'Score exceeds session limits. Try another round.';end if;
 v_reward := case v_run.game
  when 'tetris' then p_score/50       -- 500 points = 10 Stardust (2%)
  when 'snake' then p_score/2          -- 20 apples = 10 Stardust (50%)
  when 'flappy' then p_score           -- 10 pipes = 10 Stardust (100%)
  else 0 end;
 v_reward:=least(30,v_reward);
 select coalesce(sum(stardust),0) into v_today
 from public.orbit_game_runs
 where user_id=v_user and finished_at >= pg_catalog.date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 v_awarded:=least(v_reward,greatest(0,60-v_today));
 update public.orbit_game_runs set score=p_score,stardust=v_awarded,finished_at=now()
 where id=p_run_id;
 select coalesce(sum(stardust),0) into v_total from public.orbit_game_runs where user_id=v_user;
 select coalesce(max(score),0) into v_best from public.orbit_game_runs where user_id=v_user and game=v_run.game and finished_at is not null;
 return pg_catalog.jsonb_build_object(
  'game',v_run.game,'score',p_score,'earned',v_awarded,
  'total',v_total,'today',v_today+v_awarded,'daily_cap',60,'best',v_best
 );
end;
$$;
revoke all on function public.orbit_finish_game(uuid,integer) from public,anon;
grant execute on function public.orbit_finish_game(uuid,integer) to authenticated;

create or replace function public.orbit_game_summary()
returns jsonb
language plpgsql stable security definer
set search_path=''
as $$
declare v_user uuid:=(select auth.uid());v_total integer;v_today integer;v_best jsonb;
begin
 if v_user is null or not private.orbit_is_member() then
   raise exception 'Sign in with an approved account to see your games.';
 end if;
 select coalesce(sum(stardust),0) into v_total from public.orbit_game_runs where user_id=v_user;
 select coalesce(sum(stardust),0) into v_today from public.orbit_game_runs
 where user_id=v_user and finished_at>=pg_catalog.date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select pg_catalog.jsonb_build_object(
  'tetris',coalesce(max(score)filter(where game='tetris'),0),
  'snake',coalesce(max(score)filter(where game='snake'),0),
  'flappy',coalesce(max(score)filter(where game='flappy'),0)
 ) into v_best
 from public.orbit_game_runs where user_id=v_user and finished_at is not null;
 return pg_catalog.jsonb_build_object('total',v_total,'today',v_today,'daily_cap',60,'best',v_best);
end;
$$;
revoke all on function public.orbit_game_summary() from public,anon;
grant execute on function public.orbit_game_summary() to authenticated;
