# TAILG Site Control — Foundation V1

Prototype quản lý thi công móng cho dự án TAILG, tối ưu để deploy thẳng lên Vercel mà không cần build.

## Phạm vi V1

- 7 tài khoản nghiệp vụ: 1 Chỉ huy trưởng + 6 Đội trưởng.
- 6 đội nhập: ngày, số lượng công nhân, khu vực, công việc móng, tên móng, % tiến độ, ghi chú.
- Dữ liệu của 6 đội được tổng hợp trong dashboard Chỉ huy trưởng.
- Chống trùng chủ quản móng: cùng một tên móng không thể thuộc 2 đội khác nhau.
- Mặt bằng tiến độ mô phỏng theo phân khu Xưởng 1 / Xưởng 2 / Xưởng 3 / Nhà ăn / Nhà xe / Bể ngầm / Bể XLNT / Hạ tầng.
- Có danh mục móng, lịch sử báo cáo, cảnh báo đội chưa báo cáo, mốc tiến độ, xuất JSON/CSV.
- Responsive cho desktop, tablet và điện thoại.

## Tài khoản demo

PIN mặc định cho toàn bộ tài khoản: `123456`

| Tài khoản | Vai trò | Phạm vi |
|---|---|---|
| Phan Viết Tùng | Chỉ huy trưởng | Xem tổng hợp 6 đội |
| Bùi Văn Đức | Đội trưởng | 1/4 Xưởng 1, Xưởng 2 |
| Tăng Văn Toán | Đội trưởng | 1/4 Xưởng 1 |
| Trần Văn Toãn | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Văn Tuần | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Ánh Quang | Đội trưởng | 1/2 Xưởng 3, Nhà ăn, Nhà xe, Bể ngầm, Bể XLNT |
| Nguyễn Duy Thọ | Đội trưởng | 1/2 Xưởng 3, Hạ tầng |

## Chạy local

Không cần cài package. Mở `index.html` trực tiếp hoặc chạy một static server:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Deploy Vercel

1. Import repository này vào Vercel.
2. Framework Preset: `Other`.
3. Không cần Build Command.
4. Output Directory để trống.
5. Deploy.

`vercel.json` đã có sẵn cấu hình cơ bản.

## Lưu ý kiến trúc V1

V1 cố ý dùng `localStorage` để chạy ngay, đúng tinh thần “làm tài khoản + nhập nhân công/công việc/móng trước, nâng cấp sau”. Vì vậy dữ liệu chỉ đồng bộ giữa các tài khoản khi dùng **cùng một trình duyệt/thiết bị**.

Để 6 đội dùng 6 điện thoại khác nhau và Chỉ huy trưởng thấy dữ liệu real-time, V2 nên chuyển lớp lưu trữ sang Supabase/Postgres hoặc một database trên Vercel. Mô hình dữ liệu hiện tại (`logs`, `foundations`, `users`, `zones`) đã tách rõ để migrate.

## Quy tắc nghiệp vụ móng

- Một tên móng chỉ có một đội chủ quản.
- Đội chỉ được nhập khu vực đã phân công.
- Có thể cập nhật lại cùng tên móng nếu vẫn thuộc đúng đội; tiến độ mới nhất sẽ được dùng cho danh mục.
- Nếu nhập một tên móng đã thuộc đội khác, hệ thống chặn lưu và báo đội đang sở hữu.
- Khi xóa một báo cáo, danh mục móng được dựng lại từ các báo cáo còn lại để tránh dữ liệu treo.
