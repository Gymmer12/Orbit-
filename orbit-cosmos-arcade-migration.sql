-- ORBIT + Cosmos (formerly Stardust): rename balance column without losing old
-- earnings; expand the built-in Arcade to match Alan's 16 non-gambling cartridge titles.
-- Third-party imported game assets, ROMs and casino games are NOT copied.
begin;
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='orbit_game_runs' and column_name='stardust')
 and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='orbit_game_runs' and column_name='cosmos') then
   alter table public.orbit_game_runs rename column stardust to cosmos;
 end if;
end$$;
alter table public.orbit_game_runs drop constraint if exists orbit_game_runs_game_check;
alter table public.orbit_game_runs add constraint orbit_game_runs_game_check check(game in ('tetris','snake','flappy','game2048','blockblast','breakout','dino','fruitninja','geodash','girder','minesweeper','pacman','slither','slope','sudoku','wordle'));
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
 if p_game is null or p_game not in ('tetris','snake','flappy','game2048','blockblast','breakout','dino','fruitninja','geodash','girder','minesweeper','pacman','slither','slope','sudoku','wordle') then
   raise exception 'Unsupported game.';
 end if;
 -- Serializes starts/finishes for a single user without exposing writable scores.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,418));
 update public.orbit_game_runs set finished_at=now(),score=0,cosmos=0
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
 v_reward:=least(30,v_reward);
 select coalesce(sum(cosmos),0) into v_today
 from public.orbit_game_runs
 where user_id=v_user and finished_at >= pg_catalog.date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 v_awarded:=least(v_reward,greatest(0,60-v_today));
 update public.orbit_game_runs set score=p_score,cosmos=v_awarded,finished_at=now()
 where id=p_run_id;
 select coalesce(sum(cosmos),0) into v_total from public.orbit_game_runs where user_id=v_user;
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
 return pg_catalog.jsonb_build_object('total',v_total,'today',v_today,'daily_cap',60,'best',v_best);
end;
$$;
revoke all on function public.orbit_game_summary() from public,anon;
grant execute on function public.orbit_game_summary() to authenticated;

commit;
