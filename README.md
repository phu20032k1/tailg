# TAILG Site Control V3

Nền tảng điều hành thi công Pilot cho dự án TAILG, tập trung vào luồng dữ liệu thật của công trường:

**6 Đội trưởng báo cáo trước 07:30 → hệ thống lưu tập trung → Ban điều hành xem Dashboard/Excel → tổng hợp báo cáo tuần PowerPoint cho Chủ đầu tư.**

## Stack

- **Frontend:** Next.js App Router + React + TypeScript
- **Backend:** Next.js Route Handlers trên Node.js/Vercel
- **Database:** PostgreSQL trên Supabase
- **Ảnh + PDF:** private Supabase Storage
- **Auth:** username/PIN băm bằng PostgreSQL `pgcrypto` + session JWT HttpOnly
- **Excel:** ExcelJS
- **PowerPoint:** PptxGenJS
- **Deploy:** Vercel

## V3 làm được gì?

### Báo cáo hằng ngày

Mỗi đội có thể dán nguyên tin nhắn báo cáo cơ học từ nhóm dự án. Trình duyệt bóc tách theo quy tắc, không dùng AI, thành:

- ngày + đội;
- kỹ thuật, lái máy, bảo vệ, TD;
- công nhật, cốt thép, cốp pha/ván khuôn;
- máy móc/xe;
- công việc chính;
- công việc khác;
- ảnh hiện trường;
- tin nhắn gốc để đối chiếu.

Người nhập rà lại trước khi bấm lưu.

### Tổng hợp nhân lực

Trang `/manpower` tạo bảng cột đứng theo ngày cho 6 đội và toàn dự án. Có nút **Xuất Excel**.

Quy ước `workers` hiện dùng đúng cách bảng theo dõi thực tế đang cộng:

**Công nhật + Cốt thép + Cốp pha/ván khuôn**.

Kỹ thuật, lái máy, bảo vệ, TD vẫn được lưu riêng để Ban điều hành kiểm soát nhưng không cộng vào `workers`.

### Báo cáo tuần PowerPoint

Trang `/weekly-report` lấy dữ liệu trong khoảng ngày đã chọn:

- nhân lực/máy móc;
- công việc chính;
- công việc khác;
- ảnh thi công;
- mặt bằng tiến độ;
- bản nháp kế hoạch tuần tới.

Có nút **Xuất PowerPoint**. File PPTX dùng cấu trúc báo cáo TAILG/LICOGI18.3: cập nhật hiện trường → kế hoạch tuần tới → an toàn → các vấn đề khác, với tiêu đề cố định Việt/Trung.

Mặt bằng thi công được quản lý đúng quy trình hiện tại: upload **PDF nguồn + ảnh crop**; ảnh crop được chèn vào PowerPoint, PDF nguồn được giữ trong Storage để truy vết.

## 7 tài khoản Pilot

| Username | Họ tên | Vai trò / phạm vi |
|---|---|---|
| `tung` | Phan Viết Tùng | Chỉ huy trưởng · xem toàn bộ |
| `duc` | Bùi Văn Đức | 1/4 Xưởng 1 + Xưởng 2 |
| `toan` | Tăng Văn Toán | 1/4 Xưởng 1 |
| `toan-tran` | Trần Văn Toãn | 1/4 Xưởng 1 |
| `tuan` | Nguyễn Văn Tuần | 1/4 Xưởng 1 |
| `quang` | Nguyễn Ánh Quang | 1/2 Xưởng 3 + Nhà ăn + Nhà xe + Bể ngầm + Bể XLNT |
| `tho` | Nguyễn Duy Thọ | 1/2 Xưởng 3 + Hạ tầng |

## Cài database mới

Nếu project Supabase đã chạy V2 (`schema.sql`, `seed.sql`, `functions.sql`), chạy tiếp trong **SQL Editor**, đúng thứ tự:

```text
1. supabase/migrations/20260907_daily_reporting_v3.sql
2. supabase/migrations/20260907_weekly_report_assets.sql
3. supabase/seed_real_2026_09_07.sql
```

File số 3 đưa bộ dữ liệu báo cáo thật ngày **07/09/2026** của đủ 6 đội vào PostgreSQL. Kết quả kiểm tra cuối seed phải là:

```text
report_date      2026-09-07
direct_workers   320
technical_staff  30
teams_reported   6
```

## Source chính

```text
tailg/
├── app/
│   ├── (dashboard)/
│   │   ├── reports/new/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── manpower/page.tsx
│   │   ├── weekly-report/page.tsx
│   │   ├── foundations/page.tsx
│   │   ├── map/page.tsx
│   │   ├── teams/page.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── reports/route.ts
│   │   ├── reports/[id]/photos/route.ts
│   │   ├── manpower/xlsx/route.ts
│   │   ├── weekly-report/assets/route.ts
│   │   └── weekly-report/pptx/route.ts
│   └── ...
├── components/
│   ├── daily-report-form.tsx
│   ├── weekly-asset-form.tsx
│   └── ...
├── lib/
│   ├── report-message-parser.ts
│   ├── data.ts
│   └── ...
├── supabase/
│   ├── migrations/
│   └── seed_real_2026_09_07.sql
└── docs/DAILY_WEEKLY_REPORT_V3.md
```

## Biến môi trường Vercel

Không có biến mới so với V2:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SESSION_SECRET=
SUPABASE_STORAGE_BUCKET=site-photos
```

Không commit `.env.local`. `SUPABASE_SECRET_KEY` chỉ dùng server-side.

## Ảnh và PDF lưu ở đâu?

Ảnh/PDF thật **không lưu trong GitHub hoặc PostgreSQL**.

```text
Supabase Storage / site-photos
├── <leader_id>/<YYYY-MM-DD>/work/...     # ảnh báo cáo ngày
└── weekly/<from>-<to>/...                # PDF + ảnh crop báo cáo tuần
```

PostgreSQL chỉ lưu `storage_path` và metadata. Khi xem trên web, backend tạo signed URL.

## Chạy local

```bash
cp .env.example .env.local
npm install
npm run lint
npm run build
npm run dev
```

Mở `http://localhost:3000` và kiểm tra `/api/health`.

## Deploy Vercel

1. Chạy đủ migration V3 trên Supabase trước.
2. Push/merge source lên `main`.
3. Vercel tự nhận Next.js và cài dependency mới.
4. Redeploy.
5. Kiểm tra `/api/health`.
6. Login `tung`, kiểm tra `/manpower` và `/weekly-report`.
7. Login từng đội, thử dán tin nhắn báo cáo và upload ảnh.

Chi tiết thêm: [`docs/DAILY_WEEKLY_REPORT_V3.md`](docs/DAILY_WEEKLY_REPORT_V3.md).
