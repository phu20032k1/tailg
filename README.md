# TAILG Site Control V2

Pilot điều hành thi công cho dự án TAILG, đã chuyển từ Vanilla/localStorage sang kiến trúc production-friendly:

- **Frontend:** Next.js App Router + React + TypeScript
- **Backend:** Next.js Route Handlers trên Node.js/Vercel
- **Database:** PostgreSQL trên Supabase
- **Ảnh hiện trường:** private Supabase Storage
- **Auth:** username/PIN băm bằng PostgreSQL `pgcrypto` + session JWT HttpOnly
- **Deploy:** Vercel

## Phạm vi Giai đoạn 1

Chỉ làm đúng luồng:

**6 Đội trưởng nhập hằng ngày → PostgreSQL lưu tập trung → Phan Viết Tùng xem Dashboard.**

Dữ liệu nhập gồm ngày, nhân công, cán bộ kỹ thuật, khu vực, công việc móng, tên/mã móng, khối lượng, phần trăm tiến độ, vướng mắc, ghi chú và ảnh hiện trường.

Chưa đưa AI, chatbot, ERP, BIM, kế toán, vật tư/máy móc đầy đủ vào V2 này.

## 7 tài khoản

| Tài khoản | Vai trò | Phạm vi |
|---|---|---|
| Phan Viết Tùng | Chỉ huy trưởng | Dashboard tổng hợp |
| Bùi Văn Đức | Đội trưởng | 1/4 Xưởng 1 + Xưởng 2 |
| Tăng Văn Toán | Đội trưởng | 1/4 Xưởng 1 |
| Trần Văn Toãn | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Văn Tuần | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Ánh Quang | Đội trưởng | 1/2 Xưởng 3 + Nhà ăn + Nhà xe + Bể ngầm + Bể XLNT |
| Nguyễn Duy Thọ | Đội trưởng | 1/2 Xưởng 3 + Hạ tầng |

PIN được bạn tự đặt trong `supabase/seed.sql` trước khi chạy seed; PIN không được commit vào repository.

## Source chính

```text
tailg/
├── app/
│   ├── (dashboard)/
│   │   ├── foundations/page.tsx
│   │   ├── map/page.tsx
│   │   ├── reports/new/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── teams/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   ├── auth/logout/route.ts
│   │   ├── health/route.ts
│   │   ├── reports/route.ts
│   │   └── reports/[id]/photos/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── login/page.tsx
├── components/
├── docs/SETUP_SUPABASE.md
├── lib/
├── supabase/
│   ├── schema.sql
│   ├── seed.sql
│   └── functions.sql
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Backend

```text
Điện thoại Đội trưởng
        │
        ▼
Next.js UI
        │
        ├── POST /api/reports
        │       ▼
        │   create_work_entry()
        │       ├── kiểm tra đúng khu vực
        │       ├── chặn trùng chủ quản móng
        │       ├── cập nhật nhân lực
        │       ├── lưu công việc
        │       └── cập nhật trạng thái móng
        │
        └── POST /api/reports/:id/photos
                ▼
          Supabase Storage

PostgreSQL ─────────────→ Dashboard Phan Viết Tùng
Storage ảnh ────────────→ signed URL → Dashboard
```

## Lấy API Supabase + cài đặt

Đọc file **[`docs/SETUP_SUPABASE.md`](docs/SETUP_SUPABASE.md)**. Trong đó có từng bước:

1. tạo Supabase project;
2. lấy Project URL;
3. lấy server Secret API key dạng `sb_secret_...`;
4. chạy 3 file SQL;
5. tạo `SESSION_SECRET`;
6. cấu hình `.env.local`;
7. chạy local;
8. thêm Environment Variables trên Vercel;
9. kiểm tra `/api/health`;
10. test 7 tài khoản.

Tóm tắt chạy local:

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Biến môi trường

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SESSION_SECRET=
SUPABASE_STORAGE_BUCKET=site-photos
```

Không commit `.env.local`.

**`SUPABASE_SECRET_KEY` tuyệt đối không được đưa vào biến `NEXT_PUBLIC_*` hoặc gửi cho người dùng cuối.** App vẫn có fallback cho legacy `SUPABASE_SERVICE_ROLE_KEY` nếu project cũ chưa chuyển key mới.

## Ảnh lưu ở đâu?

Ảnh thật **không lưu trong GitHub, localStorage hoặc PostgreSQL**.

Ảnh được lưu trong private Supabase Storage bucket `site-photos`. PostgreSQL chỉ giữ `storage_path` + metadata. Dashboard tạo signed URL có thời hạn khi hiển thị.

## Dữ liệu Pilot cũ

Dữ liệu localStorage/Redis của V1 không tự động migrate vào PostgreSQL V2. Nếu cần giữ dữ liệu cũ, export trước rồi viết bước import riêng.

## Test trước khi deploy

```bash
npm run build
npm run lint
```

Sau deploy mở:

```text
/api/health
```

Sau đó test:

1. Đức nhập M-01.
2. Toán thử nhập M-01 → phải bị chặn.
3. Đức tải ảnh hiện trường.
4. Tùng xem được nhân công, móng, nhật ký và ảnh.
5. Mở trên điện thoại khác → vẫn cùng nguồn PostgreSQL + Storage.
