alter table public.material_budgets add column if not exists material_spec text;
alter table public.material_budgets add column if not exists stage_label text;
alter table public.material_budgets add column if not exists allocation_level text not null default 'project';
alter table public.material_budgets add column if not exists owner_team_id uuid references public.app_users(id) on delete set null;
alter table public.material_budgets add column if not exists parent_budget_id uuid references public.material_budgets(id) on delete set null;
alter table public.material_budgets add column if not exists active boolean not null default true;
create index if not exists material_budgets_parent_idx on public.material_budgets(parent_budget_id);
create index if not exists material_budgets_team_idx on public.material_budgets(owner_team_id, active);

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  material_budget_id uuid not null references public.material_budgets(id) on delete restrict,
  team_id uuid not null references public.app_users(id) on delete restrict,
  request_date date not null,
  quantity_requested numeric(20,4) not null check (quantity_requested > 0),
  quantity_approved numeric(20,4),
  status text not null default 'commander_review' check (status in ('commander_review','khkt_review','approved','returned_to_team','returned_to_commander','cancelled')),
  team_note text,
  commander_note text,
  khkt_note text,
  submitted_at timestamptz not null default now(),
  commander_reviewed_by uuid references public.app_users(id),
  commander_reviewed_at timestamptz,
  khkt_reviewed_by uuid references public.app_users(id),
  khkt_reviewed_at timestamptz,
  returned_by uuid references public.app_users(id),
  returned_at timestamptz,
  returned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists material_requests_status_idx on public.material_requests(status, updated_at desc);
create index if not exists material_requests_team_idx on public.material_requests(team_id, request_date desc);
create index if not exists material_requests_budget_idx on public.material_requests(material_budget_id, request_date desc);
alter table public.material_requests enable row level security;

create table if not exists public.material_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests(id) on delete cascade,
  actor_id uuid references public.app_users(id) on delete set null,
  action text not null,
  note text,
  quantity_before numeric(20,4),
  quantity_after numeric(20,4),
  created_at timestamptz not null default now()
);
create index if not exists material_request_events_request_idx on public.material_request_events(request_id, created_at);
alter table public.material_request_events enable row level security;

alter table public.material_receipts add column if not exists material_request_id uuid references public.material_requests(id) on delete set null;
create index if not exists material_receipts_request_idx on public.material_receipts(material_request_id);

alter table public.payment_requests add column if not exists work_package_id uuid references public.work_packages(id) on delete set null;
alter table public.payment_requests add column if not exists quantity_claimed numeric(20,4);
alter table public.payment_requests add column if not exists quantity_unit text;
create index if not exists payment_requests_package_idx on public.payment_requests(work_package_id);
