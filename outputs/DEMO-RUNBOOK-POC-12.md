# Kịch bản demo — Sài Gòn Open City Lab PoC 12

## Mở bản trình diễn

Chạy `python3 hcmc-poc/serve.py`, sau đó mở:

`http://127.0.0.1:8768/hcmc-poc/?v=12t-demo`

Điểm vào demo tự mở góc **Toàn khu vực** ở ánh sáng ban ngày. Không thêm `view=cinematicnight` vào URL mở đầu.

Nếu không chạy server, mở `SAIGON-3D.html`. Bản độc lập giữ toàn bộ scene và giao diện; các liên kết báo cáo cần nằm cùng thư mục bàn giao.

## Kịch bản 3 phút

1. **Toàn khu vực — 25 giây.** Bắt đầu ở góc 04, ánh sáng ban ngày. Giới thiệu phạm vi 38,57 km², 70.719 khối công trình và hành lang sông Sài Gòn.
2. **Nguyễn Huệ–Bạch Đằng — 30 giây.** Chọn góc 06 hoặc 07 để cho thấy đường, cây, bờ sông và luồng giao thông được ràng buộc theo lớp bản đồ.
3. **Bitexco và Landmark 81 — 35 giây.** Đi qua góc 05 rồi 03. Chỉ ra sân đáp dạng đĩa loe và landmark chi tiết hơn nền proxy; hình học vẫn là minh họa chưa khảo sát.
4. **Reality Patch và Confidence Map — 40 giây.** Mở góc 09 rồi 17. Trình bày LOD, provenance và khoảng trống dữ liệu: 0 ảnh khảo sát, 0 tile reality đã đo, cùng hàng đợi khu vực cần thu thập.
5. **Cinematic Night — 45 giây.** Chuyển sang góc 18 ở cuối, nhấn “Trailer 45 giây”, rồi `H` để giấu UI. Nêu rõ blue hour, vệt đèn và mặt đường ẩm là lớp trình diễn thủ tục.

## Điều khiển khi đứng demo

- Mũi tên hoặc `WASD`: di chuyển tâm bản đồ theo hướng camera.
- `Q` / `E`: xoay; `+` / `−`: zoom.
- `H`: ẩn hoặc hiện toàn bộ giao diện; `F`: toàn màn hình.
- `0`: đặt lại góc hiện tại; `Esc`: đóng drawer, hộp thông tin và chế độ trình chiếu.
- Kéo chuột trái: xoay; chuột phải hoặc Shift + kéo: dịch; cuộn: zoom.

## Ba câu cần giữ đúng

- Đây là PoC tái hiện hình thái đô thị từ dữ liệu mở, chưa phải digital twin đã khảo sát.
- Phần lớn chiều cao còn là ước lượng có khai báo nguồn và độ tin cậy.
- Bản đồ chưa đủ điều kiện dùng cho điều hướng UAV hoặc lập kế hoạch bay an toàn.

## Phương án dự phòng

Giữ `SAIGON-3D.html` trên máy và mở sẵn tab Cinematic Night. Nếu GPU yếu, trong bảng Cinematic chọn “Balanced”; nếu font web không tải, giao diện tự dùng font hệ thống.
