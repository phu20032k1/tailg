# Lấy API Supabase và kết nối TAILG

TAILG V2 dùng **Supabase PostgreSQL + Supabase Storage**. Frontend không gọi Supabase trực tiếp. Mọi truy cập database/storage đi qua Next.js server nên khóa server không bị lộ ra trình duyệt.

## 1. Tạo project Supabase

1. Đăng nhập Supabase.
2. Chọn **New project**.
3. Đặt tên, ví dụ `tailg-site-control`.
4. Chọn region gần công trường/người dùng.
5. Lưu database password ở nơi an toàn.

## 2. Lấy Project URL và Secret API key

Supabase hiện khuyến nghị hệ key mới:

- `sb_publishable_...` dùng cho browser/mobile khi cần.
- `sb_secret_...` dùng cho backend/server và có quyền elevated.

TAILG V2 hiện chỉ cần **server Secret key** vì mọi truy cập Supabase đều đi qua Next.js backend.

Trong Supabase Dashboard của project:

1. Mở **Connect** để xem/copy Project URL, hoặc vào **Settings → API Keys**.
2. Copy **Project URL**, ví dụ `https://xxxxx.supabase.co`.
3. Trong **Settings → API Keys**, tạo hoặc copy **Secret key** dạng `sb_secret_...`.
4. Không dùng Secret key trong browser và không đặt nó dưới tên biến bắt đầu bằng `NEXT_PUBLIC_`.

Gán vào `.env.local`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

Nếu project cũ chưa có Secret key mới, app vẫn hỗ trợ legacy `service_role` bằng biến:

```env
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

Nhưng nên ưu tiên `SUPABASE_SECRET_KEY`.

## 3. Tạo database

Supabase → **SQL Editor** → chạy lần lượt:

1. `supabase/schema.sql`
2. `supabase/seed.sql`
3. `supabase/functions.sql`

Trước khi chạy `seed.sql`, thay chuỗi:

```text
CHANGE_THIS_PIN_BEFORE_RUN
```

bằng PIN Pilot mà bạn muốn cấp cho 7 tài khoản. PIN được băm bằng `pgcrypto`, database không lưu PIN dạng chữ thường.

Ba file SQL sẽ tạo:

- `app_users`
- `zones`
- `daily_reports`
- `work_items`
- `foundations`
- `report_photos`
- `project_milestones`
- RPC `authenticate_user`
- RPC `create_work_entry`
- private Storage bucket `site-photos`
- 7 tài khoản Pilot
- các khu vực Xưởng 1/2/3, Nhà ăn, Nhà xe, Bể ngầm, Bể XLNT, Hạ tầng
- 4 mốc tiến độ móng ban đầu

## 4. Tạo SESSION_SECRET

### macOS / Linux / Git Bash

```bash
openssl rand -base64 48
```

### Node.js

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Copy kết quả vào:

```env
SESSION_SECRET=chuoi-rat-dai-vua-tao
```

## 5. Tạo `.env.local`

```bash
cp .env.example .env.local
```

Điền:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
SESSION_SECRET=xxxxx
SUPABASE_STORAGE_BUCKET=site-photos
```

## 6. Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

Kiểm tra backend tại `http://localhost:3000/api/health`.

Kết quả đúng:

```json
{
  "ok": true,
  "database": "connected",
  "storage": "connected"
}
```

## 7. 7 tài khoản Pilot

| username | Họ tên | Vai trò |
|---|---|---|
| `tung` | Phan Viết Tùng | Chỉ huy trưởng |
| `duc` | Bùi Văn Đức | Đội trưởng |
| `toan` | Tăng Văn Toán | Đội trưởng |
| `toan-tran` | Trần Văn Toãn | Đội trưởng |
| `tuan` | Nguyễn Văn Tuần | Đội trưởng |
| `quang` | Nguyễn Ánh Quang | Đội trưởng |
| `tho` | Nguyễn Duy Thọ | Đội trưởng |

## 8. Đổi PIN sau này

Ví dụ đổi PIN của Bùi Văn Đức:

```sql
update public.app_users
set pin_hash = crypt('PIN_MOI', gen_salt('bf', 12))
where username = 'duc';
```

## 9. Ảnh được lưu ở đâu?

File ảnh thật:

```text
Supabase Storage
└── site-photos/
    └── <leader_id>/
        └── <YYYY-MM-DD>/
            └── <uuid>-<ten-file>
```

PostgreSQL chỉ lưu metadata trong `report_photos`: `report_id`, `storage_path`, `caption`, `created_by`, `created_at`.

Bucket là **private**. Dashboard tạo signed URL ngắn hạn khi cần xem ảnh.

## 10. Deploy Vercel

1. Import GitHub repository `phu20032k1/tailg`.
2. Vercel tự nhận framework **Next.js**.
3. Vào **Settings → Environment Variables**.
4. Thêm đủ:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SESSION_SECRET
SUPABASE_STORAGE_BUCKET
```

5. Redeploy.
6. Mở `/api/health`.
7. Khi database và storage đều `connected`, mới bắt đầu nhập dữ liệu thật.

## 11. Test luồng 7 tài khoản

1. Đăng nhập `duc`, nhập `M-01`, `M-02` và 1 ảnh.
2. Đăng xuất.
3. Đăng nhập `toan`, thử nhập lại `M-01`.
4. Backend phải báo móng đã thuộc đội khác.
5. Đăng nhập `tung`.
6. Dashboard phải thấy báo cáo của Đức, nhân công, móng và ảnh.
7. Dùng điện thoại khác đăng nhập đội khác và nhập dữ liệu.
8. Vì dữ liệu nằm trên PostgreSQL/Storage nên các thiết bị nhìn chung một nguồn dữ liệu.
