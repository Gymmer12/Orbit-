-- ORBIT + per-member home artwork, recoloring, and motion preferences.
-- Existing home_theme and full-site palette settings remain unchanged.
alter table public.orbit_appearance
 add column if not exists home_background text not null default 'original',
 add column if not exists home_tint text not null default '#4767DF',
 add column if not exists home_tint_strength integer not null default 0,
 add column if not exists home_motion boolean not null default true;

alter table public.orbit_appearance
 drop constraint if exists orbit_appearance_home_background_check;
alter table public.orbit_appearance
 add constraint orbit_appearance_home_background_check
 check(home_background in ('original','space','starfield','gradient'));
alter table public.orbit_appearance
 drop constraint if exists orbit_appearance_home_tint_hex_check;
alter table public.orbit_appearance
 add constraint orbit_appearance_home_tint_hex_check
 check(home_tint ~ '^#[0-9A-Fa-f]{6}$');
alter table public.orbit_appearance
 drop constraint if exists orbit_appearance_home_tint_strength_check;
alter table public.orbit_appearance
 add constraint orbit_appearance_home_tint_strength_check
 check(home_tint_strength between 0 and 75);

-- Existing per-user RLS on orbit_appearance protects these new columns too.
