# TAILG Site Control — Foundation V1

Pilot quản lý thi công móng cho dự án TAILG, thiết kế để triển khai nhanh trên Vercel và dùng tốt trên điện thoại tại công trường.

## Phạm vi V1

- 7 tài khoản nghiệp vụ: 1 Chỉ huy trưởng + 6 Đội trưởng.
- 6 đội nhập: ngày, số lượng công nhân, khu vực, công việc móng, tên móng, % tiến độ, ghi chú.
- Dữ liệu của 6 đội tự động tổng hợp trong dashboard Chỉ huy trưởng.
- Chống trùng chủ quản móng: cùng một tên móng không thể thuộc 2 đội khác nhau.
- Mặt bằng tiến độ mô phỏng theo phân khu Xưởng 1 / Xưởng 2 / Xưởng 3 / Nhà ăn / Nhà xe / Bể ngầm / Bể XLNT / Hạ tầng.
- Có danh mục móng, lịch sử báo cáo, cảnh báo đội chưa báo cáo, mốc tiến độ, xuất JSON/CSV.
- Responsive cho desktop, tablet và điện thoại.
- Có chế độ Cloud Sync tùy chọn để 6 đội nhập từ nhiều thiết bị và Chỉ huy trưởng nhận dữ liệu tự động.

## 7 tài khoản Pilot

PIN demo mặc định cho toàn bộ tài khoản: `123456`

| Tài khoản | Vai trò | Phạm vi |
|---|---|---|
| Phan Viết Tùng | Chỉ huy trưởng | Xem tổng hợp 6 đội |
| Bùi Văn Đức | Đội trưởng | 1/4 Xưởng 1, Xưởng 2 |
| Tăng Văn Toán | Đội trưởng | 1/4 Xưởng 1 |
| Trần Văn Toãn | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Văn Tuần | Đội trưởng | 1/4 Xưởng 1 |
| Nguyễn Ánh Quang | Đội trưởng | 1/2 Xưởng 3, Nhà ăn, Nhà xe, Bể ngầm, Bể XLNT |
| Nguyễn Duy Thọ | Đội trưởng | 1/2 Xưởng 3, Hạ tầng |

## Quy tắc nghiệp vụ móng

- Một tên móng chỉ có một đội chủ quản.
- Đội chỉ được nhập khu vực đã phân công.
- Có thể cập nhật lại cùng tên móng nếu vẫn thuộc đúng đội; tiến độ mới nhất được dùng cho danh mục.
- Nếu nhập một tên móng đã thuộc đội khác, hệ thống chặn lưu và báo đội đang sở hữu.
- Khi xóa báo cáo, danh mục móng được dựng lại từ các báo cáo còn lại.
- Tên móng có thể tạm dùng `M-01`, `M-02`, `M-03`... rồi chuẩn hóa lại khi có danh mục chính thức.

## Mốc tiến độ đang đưa vào Dashboard

- Móng Xưởng 1: 16/07/2026 → 07/09/2026.
- Cốt thép, cốp pha, bê tông móng + dầm móng Xưởng 1: 25/07/2026 → 07/09/2026.
- Móng Xưởng 2 + 3: 29/08/2026 → 08/11/2026.
- Cốt thép, cốp pha, bê tông móng + dầm móng Xưởng 2 + 3: 10/09/2026 → 08/11/2026.

## Chạy local

Không cần cài package. Mở `index.html` trực tiếp hoặc chạy static server:

```bash
python -m http.server 8080
```

Mở `http://localhost:8080`.

## Deploy Vercel — chế độ nhanh

1. Import repository `phu20032k1/tailg` vào Vercel.
2. Framework Preset: `Other`.
3. Không cần Build Command.
4. Output Directory để trống.
5. Deploy.

`vercel.json` đã có sẵn cấu hình cho static site + `/api/state`.

Nếu chưa cấu hình database, web vẫn chạy bình thường ở chế độ **Dữ liệu cục bộ V1**. Chế độ này chỉ phù hợp demo trên cùng một thiết bị/trình duyệt.

## Bật Cloud Sync cho 6 điện thoại

Để 6 Đội trưởng nhập trên các điện thoại khác nhau và tài khoản Phan Viết Tùng nhìn thấy dữ liệu, cần gắn một Redis REST database cho project Vercel.

Có thể dùng Vercel Marketplace / Upstash Redis. Sau khi kết nối, project cần có một trong hai cặp biến môi trường sau:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

hoặc:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Sau đó Redeploy. Khi kết nối thành công, góc dưới sidebar sẽ đổi từ `Dữ liệu cục bộ V1` sang `Cloud sync · 7 tài khoản`.

Cloud V1 hiện có cơ chế:

- tự đẩy báo cáo sau khi lưu;
- tự kéo dữ liệu mới định kỳ khoảng 8 giây;
- hợp nhất báo cáo theo `log.id` để giảm nguy cơ ghi đè khi nhiều đội nhập gần nhau;
- đồng bộ thao tác xóa báo cáo bằng danh sách tombstone `deletedLogIds`;
- tải lại dashboard khi có revision mới từ thiết bị khác.

## Kiểm thử nhanh trước khi dùng thật

1. Đăng nhập Bùi Văn Đức, nhập 2 móng `M-01, M-02`.
2. Đăng nhập Tăng Văn Toán và thử nhập lại `M-01` → hệ thống phải chặn trùng chủ quản.
3. Dùng 2 trình duyệt/điện thoại khác nhau khi Cloud Sync đã bật: một máy nhập báo cáo, máy Phan Viết Tùng phải nhận dữ liệu sau vài giây.
4. Kiểm tra Chỉ huy trưởng nhìn được 6 đội, nhân công hôm nay, nhật ký và danh mục móng.
5. Đăng nhập Đội trưởng và xác nhận không xem được dữ liệu chi tiết của đội khác.

## Lưu ý trước khi production

Đây là Pilot Giai đoạn 1, chủ đích giữ nhỏ: **nhân công + công việc móng + tên móng + % tiến độ + tổng hợp 6 đội**.

PIN `123456` đang là PIN demo nằm ở frontend. Trước khi dùng như hệ thống chính thức, nên chuyển xác thực sang backend, cấp PIN/mật khẩu riêng cho từng tài khoản và không lưu thông tin đăng nhập thật trong repository public.

Chưa đưa vào V1: AI, chatbot, ERP, BIM/Digital Twin, quản lý vật tư đầy đủ, máy móc đầy đủ, kế toán, dự báo/cảnh báo thông minh hoặc quy trình nhiều cấp.
