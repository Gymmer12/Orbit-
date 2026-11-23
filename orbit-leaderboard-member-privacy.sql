-- Only opt-in profiles are shown in ranked games; defaults to private.
alter table public.profiles add column if not exists leaderboard_visible boolean not null default false;

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
  where s.points>0 and p.leaderboard_visible and private.orbit_member_active(s.user_id)
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

