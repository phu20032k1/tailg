-- Run after schema.sql and seed.sql.

create or replace function public.authenticate_user(p_username text, p_pin text)
returns table (id uuid, username text, full_name text, role text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.username, u.full_name, u.role
  from public.app_users u
  where u.active = true
    and lower(u.username) = lower(trim(p_username))
    and u.pin_hash = crypt(p_pin, u.pin_hash)
  limit 1;
$$;

create or replace function public.create_work_entry(
  p_report_date date,
  p_leader_id uuid,
  p_workers integer,
  p_technical_staff integer,
  p_zone_id text,
  p_stage text,
  p_foundation_codes text[],
  p_progress numeric,
  p_quantity numeric default 0,
  p_unit text default 'móng',
  p_note text default null,
  p_issue_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes text[];
  v_conflict text;
  v_report_id uuid;
  v_work_item_id uuid;
begin
  if p_workers < 0 or p_technical_staff < 0 then
    raise exception 'INVALID_HEADCOUNT';
  end if;
  if p_progress < 0 or p_progress > 100 then
    raise exception 'INVALID_PROGRESS';
  end if;
  if not exists (
    select 1 from public.zones z
    where z.id = p_zone_id and z.owner_id = p_leader_id
  ) then
    raise exception 'ZONE_NOT_ASSIGNED';
  end if;

  select coalesce(array_agg(distinct upper(trim(code))), '{}'::text[])
  into v_codes
  from unnest(coalesce(p_foundation_codes, '{}'::text[])) as code
  where trim(code) <> '';

  if cardinality(v_codes) = 0 then
    raise exception 'FOUNDATION_REQUIRED';
  end if;

  select f.code into v_conflict
  from public.foundations f
  where f.code = any(v_codes) and f.owner_id <> p_leader_id
  limit 1;

  if v_conflict is not null then
    raise exception 'FOUNDATION_OWNER_CONFLICT:%', v_conflict;
  end if;

  insert into public.daily_reports (report_date, leader_id, workers, technical_staff, issue_text)
  values (p_report_date, p_leader_id, p_workers, p_technical_staff, nullif(trim(p_issue_text), ''))
  on conflict (leader_id, report_date)
  do update set
    workers = excluded.workers,
    technical_staff = excluded.technical_staff,
    issue_text = excluded.issue_text,
    updated_at = now()
  returning id into v_report_id;

  insert into public.work_items (
    report_id, zone_id, stage, quantity, unit, progress, foundation_codes, note
  ) values (
    v_report_id, p_zone_id, trim(p_stage), coalesce(p_quantity, 0),
    coalesce(nullif(trim(p_unit), ''), 'móng'), p_progress, v_codes, nullif(trim(p_note), '')
  ) returning id into v_work_item_id;

  insert into public.foundations (
    code, zone_id, owner_id, current_stage, progress, status, first_work_date, last_work_date
  )
  select code, p_zone_id, p_leader_id, trim(p_stage), p_progress,
    case when p_progress >= 100 then 'done' else 'in_progress' end,
    p_report_date, p_report_date
  from unnest(v_codes) as code
  on conflict (code)
  do update set
    zone_id = excluded.zone_id,
    current_stage = excluded.current_stage,
    progress = excluded.progress,
    status = excluded.status,
    last_work_date = excluded.last_work_date,
    updated_at = now()
  where public.foundations.owner_id = excluded.owner_id;

  return jsonb_build_object(
    'report_id', v_report_id,
    'work_item_id', v_work_item_id,
    'foundation_codes', v_codes
  );
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-photos', 'site-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
