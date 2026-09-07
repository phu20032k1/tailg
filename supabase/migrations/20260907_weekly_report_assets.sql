-- Weekly report source assets: PDF plan + cropped image used in PowerPoint.

create table if not exists public.weekly_report_assets (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  asset_type text not null check (asset_type in ('plan', 'cover', 'safety', 'other')),
  title text not null,
  storage_path text not null unique,
  source_pdf_path text,
  sort_order integer not null default 0,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists weekly_report_assets_week_idx
  on public.weekly_report_assets(week_start, week_end, sort_order);

alter table public.weekly_report_assets enable row level security;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'
]
where id = 'site-photos';
