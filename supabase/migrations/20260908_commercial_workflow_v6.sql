create table if not exists public.commercial_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_kind text not null check (contract_kind in ('owner','subcontract')),
  contract_no text,
  counterparty text not null,
  scope text,
  pre_tax_value numeric(20,2) not null default 0,
  after_tax_value numeric(20,2) not null default 0,
  retention_rate numeric(6,3) not null default 0,
  source_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commercial_contracts_kind_idx on public.commercial_contracts(contract_kind, active);

create table if not exists public.owner_payment_schedule (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.commercial_contracts(id) on delete cascade,
  period_label text not null,
  planned_date date not null,
  planned_amount numeric(20,2) not null default 0,
  invoice_planned_amount numeric(20,2) not null default 0,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(contract_id, planned_date, period_label)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  request_type text not null default 'subcontractor' check (request_type in ('subcontractor','owner_receivable','other')),
  contract_id uuid references public.commercial_contracts(id) on delete set null,
  contractor_name text,
  description text not null,
  invoice_amount numeric(20,2) not null default 0,
  amount_requested numeric(20,2) not null default 0,
  amount_paid numeric(20,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','khkt_review','director_review','finance_payment','paid','returned','cancelled')),
  submitted_by uuid references public.app_users(id),
  submitted_at timestamptz,
  khkt_reviewed_by uuid references public.app_users(id),
  khkt_reviewed_at timestamptz,
  director_approved_by uuid references public.app_users(id),
  director_approved_at timestamptz,
  finance_paid_by uuid references public.app_users(id),
  finance_paid_at timestamptz,
  returned_by uuid references public.app_users(id),
  returned_at timestamptz,
  returned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_requests_status_idx on public.payment_requests(status, updated_at desc);
create index if not exists payment_requests_contract_idx on public.payment_requests(contract_id);

create table if not exists public.payment_approval_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.payment_requests(id) on delete cascade,
  actor_id uuid references public.app_users(id),
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payment_approval_events_request_idx on public.payment_approval_events(request_id, created_at);

create table if not exists public.payment_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.payment_requests(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists payment_documents_request_idx on public.payment_documents(request_id, created_at);

create table if not exists public.material_budgets (
  id uuid primary key default gen_random_uuid(),
  material_name text not null,
  unit text not null,
  budget_quantity numeric(20,4) not null default 0,
  area_label text,
  contractor_name text,
  note text,
  source_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(material_name, unit, area_label, contractor_name)
);

create table if not exists public.material_receipts (
  id uuid primary key default gen_random_uuid(),
  material_budget_id uuid not null references public.material_budgets(id) on delete cascade,
  receipt_date date not null,
  supplier text,
  invoice_no text,
  quantity numeric(20,4) not null check (quantity >= 0),
  unit_price numeric(20,2) not null default 0,
  source_scope text,
  note text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists material_receipts_budget_idx on public.material_receipts(material_budget_id, receipt_date);

create table if not exists public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  cost_date date not null,
  owner_type text not null default 'team' check (owner_type in ('ban','team','subcontractor','project')),
  owner_name text not null,
  category text not null default 'other' check (category in ('material','machine','other','labor')),
  supplier text,
  invoice_no text,
  description text,
  quantity numeric(20,4),
  unit text,
  unit_price numeric(20,2),
  amount numeric(20,2) not null default 0,
  source_label text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists cost_entries_owner_idx on public.cost_entries(owner_type, owner_name, cost_date);

create table if not exists public.work_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  area_label text,
  owner_type text not null default 'team' check (owner_type in ('team','subcontractor','ban')),
  owner_name text not null,
  planned_quantity numeric(20,4) not null default 0,
  unit text not null,
  planned_start date,
  planned_finish date,
  current_quantity numeric(20,4) not null default 0,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','paused')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.work_package_updates (
  id uuid primary key default gen_random_uuid(),
  work_package_id uuid not null references public.work_packages(id) on delete cascade,
  update_date date not null,
  daily_quantity numeric(20,4) not null default 0,
  cumulative_quantity numeric(20,4) not null default 0,
  note text,
  updated_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  unique(work_package_id, update_date)
);
create index if not exists work_package_updates_date_idx on public.work_package_updates(update_date, work_package_id);

alter table public.commercial_contracts enable row level security;
alter table public.owner_payment_schedule enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_approval_events enable row level security;
alter table public.payment_documents enable row level security;
alter table public.material_budgets enable row level security;
alter table public.material_receipts enable row level security;
alter table public.cost_entries enable row level security;
alter table public.work_packages enable row level security;
alter table public.work_package_updates enable row level security;