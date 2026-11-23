-- Orbit Studio: per-member, whole-site custom color palette.
-- No pricing or shop currency. Updates use the existing authenticated
-- owner-only orbit_appearance Row Level Security policies.
alter table public.orbit_appearance
 add column if not exists site_palette jsonb not null default '{}'::jsonb;
alter table public.orbit_appearance
 drop constraint if exists orbit_site_palette_safe_colors;
alter table public.orbit_appearance
 add constraint orbit_site_palette_safe_colors check (
   site_palette='{}'::jsonb
   or (
     jsonb_typeof(site_palette)='object'
     and site_palette ?& array['background','sidebar','surface','accent','text','border']
     and (site_palette - array['background','sidebar','surface','accent','text','border']) = '{}'::jsonb
     and (site_palette->>'background') ~ '^#[0-9a-fA-F]{6}$'
     and (site_palette->>'sidebar') ~ '^#[0-9a-fA-F]{6}$'
     and (site_palette->>'surface') ~ '^#[0-9a-fA-F]{6}$'
     and (site_palette->>'accent') ~ '^#[0-9a-fA-F]{6}$'
     and (site_palette->>'text') ~ '^#[0-9a-fA-F]{6}$'
     and (site_palette->>'border') ~ '^#[0-9a-fA-F]{6}$'
   )
 );
comment on column public.orbit_appearance.site_palette is
 'Personal six-color ORBIT+ palette; {} restores the original design.';
