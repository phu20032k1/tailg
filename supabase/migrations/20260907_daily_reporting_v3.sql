-- TAILG V3: daily reporting, manpower, machinery and weekly-report source data.
-- Run once after the existing schema/seed/functions files.

alter table public.daily_reports
  add column if not exists raw_message text,
  add column if not exists submitted_at timestamptz not null default now();

alter table public.report_photos
  add column if not exists area_label text,
  add column if not exists photo_type text not null default 'work';

create table if not exists public.report_labor_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  category_code text not null,
  label text not null,
  crew_name text,
  headcount integer not null check (headcount >= 0),
  counts_as_worker boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.report_equipment_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  equipment_name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'máy',
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.report_tasks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  kind text not null check (kind in ('main', 'other')),
  area_label text,
  description_vi text not null,
  description_zh text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists report_labor_report_idx
  on public.report_labor_entries(report_id, sort_order);
create index if not exists report_equipment_report_idx
  on public.report_equipment_entries(report_id, sort_order);
create index if not exists report_tasks_report_idx
  on public.report_tasks(report_id, kind, sort_order);

alter table public.report_labor_entries enable row level security;
alter table public.report_equipment_entries enable row level security;
alter table public.report_tasks enable row level security;

create or replace function public.save_daily_report_v3(
  p_report_date date,
  p_leader_id uuid,
  p_raw_message text,
  p_issue_text text,
  p_labor jsonb,
  p_equipment jsonb,
  p_tasks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_report_id uuid;
  v_workers integer := 0;
  v_technical integer := 0;
begin
  if not exists (
    select 1 from public.app_users u
    where u.id = p_leader_id and u.role = 'leader' and u.active = true
  ) then
    raise exception 'INVALID_LEADER';
  end if;

  select
    coalesce(sum(case when x.counts_as_worker then x.headcount else 0 end), 0)::integer,
    coalesce(sum(case when lower(x.category_code) = 'technical' then x.headcount else 0 end), 0)::integer
  into v_workers, v_technical
  from jsonb_to_recordset(coalesce(p_labor, '[]'::jsonb)) as x(
    category_code text,
    label text,
    crew_name text,
    headcount integer,
    counts_as_worker boolean,
    sort_order integer
  );

  insert into public.daily_reports (
    report_date, leader_id, workers, technical_staff, issue_text, raw_message, submitted_at
  ) values (
    p_report_date,
    p_leader_id,
    v_workers,
    v_technical,
    nullif(trim(coalesce(p_issue_text, '')), ''),
    nullif(trim(coalesce(p_raw_message, '')), ''),
    now()
  )
  on conflict (leader_id, report_date)
  do update set
    workers = excluded.workers,
    technical_staff = excluded.technical_staff,
    issue_text = excluded.issue_text,
    raw_message = excluded.raw_message,
    submitted_at = excluded.submitted_at,
    updated_at = now()
  returning id into v_report_id;

  delete from public.report_labor_entries where report_id = v_report_id;
  delete from public.report_equipment_entries where report_id = v_report_id;
  delete from public.report_tasks where report_id = v_report_id;

  insert into public.report_labor_entries (
    report_id, category_code, label, crew_name, headcount, counts_as_worker, sort_order
  )
  select
    v_report_id,
    lower(trim(coalesce(x.category_code, 'other'))),
    trim(coalesce(nullif(x.label, ''), x.category_code, 'Khác')),
    nullif(trim(coalesce(x.crew_name, '')), ''),
    greatest(coalesce(x.headcount, 0), 0),
    coalesce(x.counts_as_worker, false),
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_labor, '[]'::jsonb)) as x(
    category_code text,
    label text,
    crew_name text,
    headcount integer,
    counts_as_worker boolean,
    sort_order integer
  )
  where coalesce(x.headcount, 0) >= 0;

  insert into public.report_equipment_entries (
    report_id, equipment_name, quantity, unit, note, sort_order
  )
  select
    v_report_id,
    trim(x.equipment_name),
    greatest(coalesce(x.quantity, 0), 0),
    coalesce(nullif(trim(coalesce(x.unit, '')), ''), 'máy'),
    nullif(trim(coalesce(x.note, '')), ''),
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_equipment, '[]'::jsonb)) as x(
    equipment_name text,
    quantity integer,
    unit text,
    note text,
    sort_order integer
  )
  where trim(coalesce(x.equipment_name, '')) <> '';

  insert into public.report_tasks (
    report_id, kind, area_label, description_vi, description_zh, sort_order
  )
  select
    v_report_id,
    case when lower(x.kind) = 'other' then 'other' else 'main' end,
    nullif(trim(coalesce(x.area_label, '')), ''),
    trim(x.description_vi),
    nullif(trim(coalesce(x.description_zh, '')), ''),
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(coalesce(p_tasks, '[]'::jsonb)) as x(
    kind text,
    area_label text,
    description_vi text,
    description_zh text,
    sort_order integer
  )
  where trim(coalesce(x.description_vi, '')) <> '';

  return jsonb_build_object(
    'report_id', v_report_id,
    'workers', v_workers,
    'technical_staff', v_technical
  );
end;
$$;

revoke all on function public.save_daily_report_v3(date, uuid, text, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_daily_report_v3(date, uuid, text, text, jsonb, jsonb, jsonb)
  to service_role;
