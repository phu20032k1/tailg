alter table public.daily_reports add column if not exists weather_noon text;
alter table public.daily_reports add column if not exists weather_evening text;

create table if not exists public.report_edit_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  edited_by uuid not null references public.app_users(id),
  edited_by_name text not null,
  edited_at timestamptz not null default now(),
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  change_summary text
);

create index if not exists report_edit_history_report_idx
  on public.report_edit_history(report_id, edited_at desc);

alter table public.report_edit_history enable row level security;
