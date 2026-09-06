-- TAILG Site Control V2 database schema
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text not null,
  role text not null check (role in ('commander', 'leader')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id text primary key,
  name text not null,
  group_name text not null,
  scope_label text not null,
  owner_id uuid not null references public.app_users(id),
  baseline_progress numeric(5,2) not null default 0 check (baseline_progress between 0 and 100),
  sort_order integer not null default 0
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  leader_id uuid not null references public.app_users(id),
  workers integer not null default 0 check (workers >= 0),
  technical_staff integer not null default 0 check (technical_staff >= 0),
  issue_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (leader_id, report_date)
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  zone_id text not null references public.zones(id),
  stage text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'móng',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  foundation_codes text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.foundations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  zone_id text not null references public.zones(id),
  owner_id uuid not null references public.app_users(id),
  current_stage text not null default 'Chưa cập nhật',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  status text not null default 'in_progress',
  first_work_date date,
  last_work_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.project_milestones (
  id bigserial primary key,
  label text not null,
  start_date date not null,
  finish_date date not null,
  note text,
  sort_order integer not null default 0
);

create index if not exists daily_reports_date_idx on public.daily_reports(report_date desc);
create index if not exists daily_reports_leader_idx on public.daily_reports(leader_id, report_date desc);
create index if not exists work_items_report_idx on public.work_items(report_id, created_at desc);
create index if not exists foundations_owner_idx on public.foundations(owner_id, zone_id);
create index if not exists report_photos_report_idx on public.report_photos(report_id, created_at desc);

alter table public.app_users enable row level security;
alter table public.zones enable row level security;
alter table public.daily_reports enable row level security;
alter table public.work_items enable row level security;
alter table public.foundations enable row level security;
alter table public.report_photos enable row level security;
alter table public.project_milestones enable row level security;
