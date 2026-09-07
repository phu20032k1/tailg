# Lấy API Supabase và kết nối TAILG V3

TAILG dùng **Supabase PostgreSQL + private Supabase Storage**. Frontend không gọi database bằng khóa bí mật; mọi truy cập có quyền cao đi qua Next.js server.

## 1. Tạo project Supabase

1. Supabase → **New project**.
2. Đặt tên, ví dụ `tailg-site-control`.
3. Chọn region gần người dùng.
4. Lưu database password ở nơi an toàn.

## 2. Lấy Project URL + Secret API key

Trong project Supabase:

1. Bấm **Connect** để xem Project URL, hoặc vào **Settings → API Keys**.
2. Copy Project URL dạng `https://xxxxx.supabase.co`.
3. Trong **Settings → API Keys**, tạo/copy **Secret key** dạng `sb_secret_...`.
4. Không đặt secret dưới tên `NEXT_PUBLIC_*`.

`.env.local` / Vercel:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

Project cũ có thể dùng `SUPABASE_SERVICE_ROLE_KEY`, nhưng V3 ưu tiên `SUPABASE_SECRET_KEY`.

## 3. Chạy database nền V2

Supabase → **SQL Editor**, copy toàn bộ code bên trong từng file rồi Run, đúng thứ tự:

```text
1. supabase/schema.sql
2. supabase/seed.sql
3. supabase/functions.sql
```

Không gõ tên file `supabase/schema.sql` vào SQL Editor; SQL Editor cần **nội dung SQL của file**.

`schema.sql` tạo extension `pgcrypto`. File seed/functions mới đã gọi `extensions.crypt` / đặt `extensions` trong search path để phù hợp Supabase.

## 4. Chạy migration V3

Sau ba file nền, chạy tiếp:

```text
4. supabase/migrations/20260907_daily_reporting_v3.sql
5. supabase/migrations/20260907_weekly_report_assets.sql
```

Migration V3 thêm:

- `raw_message`, `submitted_at` cho báo cáo ngày;
- `report_labor_entries`;
- `report_equipment_entries`;
- `report_tasks`;
- metadata loại/khu vực ảnh;
- `weekly_report_assets`;
- RPC `save_daily_report_v3`;
- cho phép private bucket `site-photos` lưu thêm PDF nguồn của mặt bằng tuần.

## 5. Đưa bộ dữ liệu thật 07/09/2026 vào PostgreSQL

Chạy:

```text
6. supabase/seed_real_2026_09_07.sql
```

File này chứa báo cáo thật của 6 đội ngày 07/09/2026. Cuối file có câu kiểm tra, kết quả kỳ vọng:

```text
report_date      2026-09-07
direct_workers   320
technical_staff  30
teams_reported   6
```

`direct_workers` = công nhật + cốt thép + cốp pha/ván khuôn, khớp cách bảng theo dõi nhân công hiện tại đang tổng hợp. Kỹ thuật, lái máy, bảo vệ, TD được lưu riêng.

## 6. Tạo SESSION_SECRET

Terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Copy kết quả:

```env
SESSION_SECRET=chuoi-ngau-nhien-rat-dai
```

## 7. Bốn biến môi trường cần có

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
SESSION_SECRET=xxxxx
SUPABASE_STORAGE_BUCKET=site-photos
```

Trên Vercel: **Project → Settings → Environment Variables** → thêm đủ 4 biến → Save → Redeploy.

## 8. 7 tài khoản Pilot

| username | Họ tên | Vai trò |
|---|---|---|
| `tung` | Phan Viết Tùng | Chỉ huy trưởng |
| `duc` | Bùi Văn Đức | Đội trưởng |
| `toan` | Tăng Văn Toán | Đội trưởng |
| `toan-tran` | Trần Văn Toãn | Đội trưởng |
| `tuan` | Nguyễn Văn Tuần | Đội trưởng |
| `quang` | Nguyễn Ánh Quang | Đội trưởng |
| `tho` | Nguyễn Duy Thọ | Đội trưởng |

## 9. Đổi PIN

Ví dụ:

```sql
update public.app_users
set pin_hash = extensions.crypt('PIN_MOI', extensions.gen_salt('bf', 12))
where username = 'duc';
```

## 10. Chạy local

```bash
cp .env.example .env.local
npm install
npm run lint
npm run build
npm run dev
```

Mở `http://localhost:3000`.

Kiểm tra:

```text
/api/health
/reports/new
/manpower
/weekly-report
```

`/api/health` đúng khi trả database + storage `connected`.

## 11. Ảnh và PDF lưu ở đâu?

```text
Supabase Storage
└── site-photos/
    ├── <leader_id>/<YYYY-MM-DD>/work/...  # ảnh báo cáo ngày
    └── weekly/<from>-<to>/...             # PDF nguồn + ảnh crop mặt bằng
```

PostgreSQL chỉ giữ `storage_path` và metadata. Bucket là private; web dùng signed URL khi hiển thị.

## 12. Test V3

1. Login một Đội trưởng.
2. Dán nguyên tin nhắn báo cáo vào `/reports/new`.
3. Bấm **Bóc tách tin nhắn** và rà lại nhân lực/máy móc/công việc.
4. Upload ảnh thật và lưu.
5. Login `tung` → `/manpower` → kiểm tra tổng hợp → **Xuất Excel**.
6. `/weekly-report` → chọn tuần → upload PDF nguồn + ảnh crop mặt bằng → **Xuất PowerPoint**.
7. Kiểm tra file PPTX trước khi gửi Chủ đầu tư; phần kế hoạch tuần tới là bản nháp tổng hợp, cần Ban điều hành duyệt.
