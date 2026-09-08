alter table public.work_packages
add column if not exists weight_percent numeric(6,3) not null default 0
check (weight_percent between 0 and 100);