alter table public.commercial_contracts
  add column if not exists company_group text,
  add column if not exists contract_quantity numeric not null default 0,
  add column if not exists quantity_unit text;

create index if not exists commercial_contracts_company_group_idx
  on public.commercial_contracts (company_group);

comment on column public.commercial_contracts.company_group is
  'Optional grouping label so one company can contain multiple separate contracts.';
comment on column public.commercial_contracts.contract_quantity is
  'Contract quantity used for subcontractor dashboard tracking.';
comment on column public.commercial_contracts.quantity_unit is
  'Unit for contract quantity.';
