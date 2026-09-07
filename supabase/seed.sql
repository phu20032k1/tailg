-- TAILG pilot seed. Safe to run repeatedly.
-- Default pilot PIN is 123456. Change v_pin before production use.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_pin text := '123456';
begin
  -- pgcrypto may already live in public on an older project or in extensions on
  -- a standard Supabase project. Resolve either location through search_path.
  perform set_config('search_path', 'public,extensions', true);

  insert into public.app_users (id, username, full_name, role, pin_hash, active)
  values
    ('00000000-0000-0000-0000-000000000001', 'tung', 'Phan Viết Tùng', 'commander', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000002', 'duc', 'Bùi Văn Đức', 'leader', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000003', 'toan', 'Tăng Văn Toán', 'leader', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000004', 'toan-tran', 'Trần Văn Toãn', 'leader', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000005', 'tuan', 'Nguyễn Văn Tuần', 'leader', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000006', 'quang', 'Nguyễn Ánh Quang', 'leader', crypt(v_pin, gen_salt('bf', 12)), true),
    ('00000000-0000-0000-0000-000000000007', 'tho', 'Nguyễn Duy Thọ', 'leader', crypt(v_pin, gen_salt('bf', 12)), true)
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    role = excluded.role,
    pin_hash = excluded.pin_hash,
    active = excluded.active;
end $$;

insert into public.zones
  (id, name, group_name, scope_label, owner_id, baseline_progress, sort_order)
values
  ('x1-duc', 'Xưởng 1 · Khu Đức', 'Xưởng 1', '1/4 Xưởng 1', '00000000-0000-0000-0000-000000000002', 92, 10),
  ('x1-toan', 'Xưởng 1 · Khu Toán', 'Xưởng 1', '1/4 Xưởng 1', '00000000-0000-0000-0000-000000000003', 92, 20),
  ('x1-toan-tran', 'Xưởng 1 · Khu Toãn', 'Xưởng 1', '1/4 Xưởng 1', '00000000-0000-0000-0000-000000000004', 85, 30),
  ('x1-tuan', 'Xưởng 1 · Khu Tuần', 'Xưởng 1', '1/4 Xưởng 1', '00000000-0000-0000-0000-000000000005', 85, 40),
  ('x2-duc', 'Xưởng 2', 'Xưởng 2', 'Xưởng 2', '00000000-0000-0000-0000-000000000002', 15, 50),
  ('x3-quang', 'Xưởng 3 · Khu Quang', 'Xưởng 3', '1/2 Xưởng 3', '00000000-0000-0000-0000-000000000006', 0, 60),
  ('x3-tho', 'Xưởng 3 · Khu Thọ', 'Xưởng 3', '1/2 Xưởng 3', '00000000-0000-0000-0000-000000000007', 0, 70),
  ('nha-an', 'Nhà ăn', 'Phụ trợ', 'Nhà ăn', '00000000-0000-0000-0000-000000000006', 0, 80),
  ('nha-xe', 'Nhà xe', 'Phụ trợ', 'Nhà xe', '00000000-0000-0000-0000-000000000006', 83.4, 90),
  ('be-ngam', 'Bể ngầm', 'Phụ trợ', 'Bể ngầm', '00000000-0000-0000-0000-000000000006', 0, 100),
  ('be-xlnt', 'Bể XLNT', 'Phụ trợ', 'Bể xử lý nước thải', '00000000-0000-0000-0000-000000000006', 0, 110),
  ('ha-tang', 'Hạ tầng', 'Hạ tầng', 'Hạ tầng', '00000000-0000-0000-0000-000000000007', 0, 120)
on conflict (id) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  scope_label = excluded.scope_label,
  owner_id = excluded.owner_id,
  baseline_progress = excluded.baseline_progress,
  sort_order = excluded.sort_order;

insert into public.project_milestones (label, start_date, finish_date, note, sort_order)
select * from (values
  ('Móng Xưởng 1', date '2026-07-16', date '2026-09-07', 'Công tác móng', 10),
  ('BT móng + dầm móng Xưởng 1', date '2026-07-25', date '2026-09-07', 'Cốt thép, cốp pha, bê tông', 20),
  ('Móng Xưởng 2 + 3', date '2026-08-29', date '2026-11-08', 'Công tác móng', 30),
  ('BT móng + dầm móng Xưởng 2 + 3', date '2026-09-10', date '2026-11-08', 'Cốt thép, cốp pha, bê tông', 40)
) as seed(label, start_date, finish_date, note, sort_order)
where not exists (select 1 from public.project_milestones);
