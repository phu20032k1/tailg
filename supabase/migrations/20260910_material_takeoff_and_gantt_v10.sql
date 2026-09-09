create table if not exists public.material_norms (
  id uuid primary key default gen_random_uuid(),
  work_code text not null,
  work_name text not null,
  work_unit text not null,
  material_name text not null,
  material_spec text,
  material_unit text not null,
  consumption_rate numeric not null check (consumption_rate > 0),
  waste_percent numeric not null default 0 check (waste_percent >= 0),
  source_label text,
  note text,
  active boolean not null default true,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists material_norms_work_code_idx on public.material_norms(work_code, active);

create table if not exists public.design_work_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  area_label text,
  work_code text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  note text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_work_items_work_code_idx on public.design_work_items(work_code);

alter table public.work_packages add column if not exists notes text;
alter table public.work_packages add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create table if not exists public.work_package_assignees (
  work_package_id uuid not null references public.work_packages(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (work_package_id, user_id)
);
create index if not exists work_package_assignees_user_idx on public.work_package_assignees(user_id, work_package_id);

create table if not exists public.progress_custom_columns (
  id uuid primary key default gen_random_uuid(),
  column_key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);

alter table public.material_norms enable row level security;
alter table public.design_work_items enable row level security;
alter table public.work_package_assignees enable row level security;
alter table public.progress_custom_columns enable row level security;
