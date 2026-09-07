# TAILG V3 — báo cáo ngày, nhân lực, ảnh và báo cáo tuần

## Luồng nghiệp vụ

1. Trước 07:30, 6 Đội trưởng gửi báo cáo ngày.
2. Trên nền tảng có thể dán nguyên tin nhắn báo cáo, bấm **Bóc tách tin nhắn**, rà lại dữ liệu và upload ảnh.
3. Hệ thống lưu tập trung:
   - nhân lực chi tiết;
   - máy móc;
   - công việc chính;
   - công việc khác;
   - tin nhắn gốc;
   - ảnh hiện trường.
4. Ban điều hành xem bảng nhân lực theo ngày và bấm **Xuất Excel**.
5. Trang **Báo cáo tuần** tự tổng hợp một phần nội dung từ báo cáo ngày và ảnh.
6. Với mặt bằng tiến độ: upload **PDF nguồn + ảnh crop**. Ảnh crop được đưa vào PowerPoint; PDF nguồn được lưu để truy vết.
7. Bấm **Xuất PowerPoint** để tạo file `.pptx` theo phong cách báo cáo họp TAILG/LICOGI18.3.

## Database cần chạy thêm

Sau khi đã chạy `schema.sql`, `seed.sql`, `functions.sql`, mở Supabase SQL Editor và chạy tiếp:

```text
supabase/migrations/20260907_daily_reporting_v3.sql
supabase/migrations/20260907_weekly_report_assets.sql
```

Sau đó để nhập bộ dữ liệu thực ngày 07/09/2026 đã cung cấp:

```text
supabase/seed_real_2026_09_07.sql
```

Kiểm tra cuối file seed phải ra:

```text
report_date = 2026-09-07
direct_workers = 320
technical_staff = 30
teams_reported = 6
```

`320` là tổng công nhân trực tiếp theo cách bảng Excel hiện tại đang tính: cốp pha + cốt thép + công nhật. Kỹ thuật được tách riêng; lái máy, bảo vệ và TD vẫn được lưu chi tiết nhưng không cộng vào `workers`.

## Trang mới

- `/reports/new` — nhập báo cáo ngày thực tế.
- `/reports` — nhật ký nhân lực + thiết bị + công việc + ảnh + tin nhắn gốc.
- `/manpower` — ma trận nhân lực theo ngày, kiểu bảng theo dõi cột đứng.
- `/api/manpower/xlsx` — xuất Excel.
- `/weekly-report` — màn hình tổng hợp báo cáo tuần.
- `/api/weekly-report/pptx` — xuất PowerPoint.

## Báo cáo tuần

File PPTX tự sinh gồm:

- Trang bìa;
- Nội dung cuộc họp;
- I. Cập nhật tiến độ tại công trường;
- Nhân lực và máy móc;
- Công tác chính + ảnh hiện trường;
- Mặt bằng tiến độ đã crop từ PDF;
- II. Kế hoạch và tiến độ tuần tới;
- III. Công tác an toàn;
- IV. Các vấn đề khác;
- Trang cảm ơn.

Các tiêu đề cố định dùng song ngữ Việt/Trung theo phong cách file họp hiện tại. Nội dung động tiếng Trung có trường `description_zh` để Ban điều hành bổ sung khi cần.

## Ảnh và PDF lưu ở đâu

Tất cả file nằm trong private Supabase Storage bucket `site-photos`.

Ảnh báo cáo ngày:

```text
site-photos/<leader_id>/<YYYY-MM-DD>/work/...
```

Tài liệu tuần:

```text
site-photos/weekly/<from>-<to>/...
```

PostgreSQL chỉ lưu đường dẫn + metadata.

## Lưu ý triển khai

Sau khi pull source mới và chạy migration:

```bash
npm install
npm run lint
npm run build
```

Trên Vercel không cần thêm biến môi trường mới ngoài 4 biến V2:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SESSION_SECRET
SUPABASE_STORAGE_BUCKET=site-photos
```

Sau khi code lên `main`, Redeploy Vercel để nhận dependency `exceljs` và `pptxgenjs`.
