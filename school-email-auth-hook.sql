-- ORBIT + student school-email registration rule.
-- After running, configure Supabase Authentication -> Hooks -> Before User Created
-- to use Postgres function private.orbit_school_email_signup.
-- Only school-domain format is checked; a confirmed school email is still necessary.
create or replace function private.orbit_school_email_signup(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  signup_email text;
begin
  signup_email := lower(trim(coalesce(event->'user'->>'email', '')));
  if signup_email !~ '^[0-9]{2}[a-z]{2,}@tesdk12[.]net$' then
    return jsonb_build_object('error',jsonb_build_object(
      'http_code',403,
      'message','ORBIT + registration requires a school email like 24jamesh@tesdk12.net.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;
grant usage on schema private to supabase_auth_admin;
revoke all on function private.orbit_school_email_signup(jsonb) from public, anon, authenticated;
grant execute on function private.orbit_school_email_signup(jsonb) to supabase_auth_admin;
