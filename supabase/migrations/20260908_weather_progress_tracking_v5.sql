alter table public.daily_reports add column if not exists weather_morning text;
alter table public.daily_reports add column if not exists weather_afternoon text;
alter table public.daily_reports add column if not exists weather_payload jsonb;

create table if not exists public.progress_items (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  item_type text not null default 'column' check (item_type in ('foundation','column','slab','floor','other')),
  zone_id text not null references public.zones(id) on delete cascade,
  owner_id uuid not null references public.app_users(id),
  work_stage text not null,
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','paused')),
  map_x numeric(6,3),
  map_y numeric(6,3),
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(zone_id, work_stage, code)
);

create index if not exists progress_items_zone_stage_idx on public.progress_items(zone_id, work_stage, sort_order, code);
create index if not exists progress_items_owner_idx on public.progress_items(owner_id, work_stage);
alter table public.progress_items enable row level security;

create table if not exists public.progress_maps (
  id uuid primary key default gen_random_uuid(),
  work_stage text not null unique,
  title text not null,
  storage_path text not null unique,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists progress_maps_stage_idx on public.progress_maps(work_stage);
alter table public.progress_maps enable row level security;

insert into public.progress_items(code,item_type,zone_id,owner_id,work_stage,actual_start,actual_finish,progress,status,sort_order)
select f.code,'foundation',f.zone_id,f.owner_id,'Móng / đổ bê tông móng',f.first_work_date,
       case when f.progress>=100 then f.last_work_date else null end,
       f.progress,
       case when f.progress>=100 then 'completed' when f.progress>0 then 'in_progress' else 'not_started' end,
       0
from public.foundations f
on conflict(zone_id,work_stage,code) do update set
  progress=excluded.progress,
  status=excluded.status,
  actual_start=coalesce(public.progress_items.actual_start,excluded.actual_start),
  actual_finish=coalesce(excluded.actual_finish,public.progress_items.actual_finish),
  updated_at=now();
