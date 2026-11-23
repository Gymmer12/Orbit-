-- ORBIT + Leaderboards + no artificial Cosmos earning caps.
-- Migrates existing balances unchanged. Source scores are still limited by
-- anti-abuse session duration and plausible-score checks.
alter table public.orbit_game_runs
 drop constraint if exists orbit_game_runs_stardust_check;
alter table public.orbit_game_runs
 drop constraint if exists orbit_game_runs_cosmos_check;
alter table public.orbit_game_runs
 add constraint orbit_game_runs_cosmos_check check(cosmos >= 0);

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
   raise exception 'Only approved ORBIT+ members may claim Cosmos.';
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
 elsif v_run.game='flappy' then
   v_max_score:=least(150,pg_catalog.floor(v_duration*2)::integer+3);
 elsif v_run.game in ('game2048','blockblast','breakout','fruitninja','geodash','pacman','sudoku') then
   v_max_score:=least(250000,pg_catalog.floor(v_duration*135)::integer+500);
 elsif v_run.game in ('dino','slither','slope','girder') then
   v_max_score:=least(250000,pg_catalog.floor(v_duration*105)::integer+120);
 elsif v_run.game in ('minesweeper','wordle') then
   v_max_score:=least(250000,pg_catalog.floor(v_duration*25)::integer+25);
 else
   v_max_score:=0;
 end if;
 -- Reject obviously implausible scores. Arcade scores are client-generated:
 -- this reduces trivial score spoofing, but does NOT make scores tamper-proof.
 if p_score>v_max_score then raise exception 'Score exceeds session limits. Try another round.';end if;
 v_reward := case v_run.game
  when 'tetris' then p_score/50          -- 2%
  when 'snake' then p_score/2            -- 50%
  when 'flappy' then p_score              -- 100%
  when 'game2048' then p_score/100         -- 1%
  when 'blockblast' then p_score/20       -- 5%
  when 'breakout' then p_score/10         -- 10%
  when 'dino' then p_score/20             -- 5%
  when 'fruitninja' then p_score/4        -- 25%
  when 'geodash' then p_score/20          -- 5%
  when 'girder' then p_score/2            -- 50%
  when 'minesweeper' then p_score/2       -- 50%
  when 'pacman' then p_score/4            -- 25%
  when 'slither' then p_score/2           -- 50%
  when 'slope' then p_score/20            -- 5%
  when 'sudoku' then p_score/2            -- 50%
  when 'wordle' then p_score              -- 100%
  else 0 end;
 -- No daily or per-round Cosmos earning cap; validate scores/session instead.
 select coalesce(sum(cosmos),0) into v_today
 from public.orbit_game_runs
 where user_id=v_user and finished_at >= pg_catalog.date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 v_awarded:=v_reward;
 update public.orbit_game_runs set score=p_score,cosmos=v_awarded,finished_at=now()
 where id=p_run_id;
 select coalesce(sum(cosmos),0) into v_total from public.orbit_game_runs where user_id=v_user;
 select coalesce(max(score),0) into v_best from public.orbit_game_runs where user_id=v_user and game=v_run.game and finished_at is not null;
 return pg_catalog.jsonb_build_object(
  'game',v_run.game,'score',p_score,'earned',v_awarded,
  'total',v_total,'today',v_today+v_awarded,'daily_cap',null,'best',v_best
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
 select coalesce(sum(cosmos),0) into v_total from public.orbit_game_runs where user_id=v_user;
 select coalesce(sum(cosmos),0) into v_today from public.orbit_game_runs
 where user_id=v_user and finished_at>=pg_catalog.date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select pg_catalog.jsonb_build_object(
  'tetris',coalesce(max(score)filter(where game='tetris'),0),
  'snake',coalesce(max(score)filter(where game='snake'),0),
  'flappy',coalesce(max(score)filter(where game='flappy'),0),
  'game2048',coalesce(max(score)filter(where game='game2048'),0),
  'blockblast',coalesce(max(score)filter(where game='blockblast'),0),
  'breakout',coalesce(max(score)filter(where game='breakout'),0),
  'dino',coalesce(max(score)filter(where game='dino'),0),
  'fruitninja',coalesce(max(score)filter(where game='fruitninja'),0),
  'geodash',coalesce(max(score)filter(where game='geodash'),0),
  'girder',coalesce(max(score)filter(where game='girder'),0),
  'minesweeper',coalesce(max(score)filter(where game='minesweeper'),0),
  'pacman',coalesce(max(score)filter(where game='pacman'),0),
  'slither',coalesce(max(score)filter(where game='slither'),0),
  'slope',coalesce(max(score)filter(where game='slope'),0),
  'sudoku',coalesce(max(score)filter(where game='sudoku'),0),
  'wordle',coalesce(max(score)filter(where game='wordle'),0)
 ) into v_best
 from public.orbit_game_runs where user_id=v_user and finished_at is not null;
 return pg_catalog.jsonb_build_object('total',v_total,'today',v_today,'daily_cap',null,'best',v_best);
end;
$$;

-- Ranked list for approved, non-banned ORBIT + members only.
-- Display nicknames, never student emails, real names or passwords.
create or replace function public.orbit_arcade_leaderboard(p_game text default 'cosmos')
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_user uuid:=(select auth.uid());
 v_result jsonb;
begin
 if v_user is null or not private.orbit_is_member() then
   raise exception 'Approved ORBIT + membership is required.';
 end if;
 if p_game <> 'cosmos' and p_game <> all(array[
 'tetris','snake','flappy','game2048','blockblast','breakout','dino',
 'fruitninja','geodash','girder','minesweeper','pacman','slither','slope',
 'sudoku','wordle'
 ]) then
   raise exception 'Unknown leaderboard game.';
 end if;
 with scores as (
  select r.user_id,
   (case when p_game='cosmos' then sum(r.cosmos)::bigint
    else max(r.score) filter(where r.game=p_game)::bigint end) as points
  from public.orbit_game_runs r
  where r.finished_at is not null
  group by r.user_id
 ),
 ranked as (
  select s.user_id, p.nickname, s.points,
   row_number()over(order by s.points desc,p.nickname asc) as rank
  from scores s
  join public.profiles p on p.id=s.user_id
  where s.points>0 and private.orbit_member_active(s.user_id)
  order by s.points desc,p.nickname asc
  limit 50
 )
 select coalesce(jsonb_agg(
  jsonb_build_object('user_id',user_id,'nickname',nickname,'score',points,'rank',rank)
  order by rank
 ),'[]'::jsonb) into v_result from ranked;
 return v_result;
end;
$$;
revoke all on function public.orbit_arcade_leaderboard(text) from public,anon;
grant execute on function public.orbit_arcade_leaderboard(text) to authenticated;

