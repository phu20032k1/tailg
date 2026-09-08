alter table public.material_requests drop constraint if exists material_requests_status_check;
alter table public.material_requests add constraint material_requests_status_check check (status in ('commander_review','khkt_review','approved','received','returned_to_team','returned_to_commander','cancelled'));
alter table public.material_requests add column if not exists received_by uuid references public.app_users(id) on delete set null;
alter table public.material_requests add column if not exists received_at timestamptz;
