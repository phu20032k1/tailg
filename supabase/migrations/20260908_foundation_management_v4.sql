-- Foundation management V4
alter table public.foundations add column if not exists note text;
create index if not exists foundations_zone_idx on public.foundations(zone_id, code);
create index if not exists foundations_status_idx on public.foundations(status);
