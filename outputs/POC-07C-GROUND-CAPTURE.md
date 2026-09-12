# PoC 07C — Ground Capture Readiness

## Kết quả

PoC 07C biến khoảng trống “chưa có dữ liệu mặt đất” thành một kế hoạch thu thập máy đọc được quanh Bitexco. Builder lấy ứng viên từ linework đường và lối đi đã lưu, loại điểm nằm trong footprint công trình hoặc mảng xanh, rồi chọn một điểm tốt cho mỗi cung phương vị.

Kế hoạch hiện có:

- **23 trạm camera ứng viên** trên 24 cung phương vị.
- **95,8% góc phủ phương vị**, thiếu cung số 16.
- Ba dải nhìn tại mỗi trạm: chân, thân và đỉnh mặt đứng.
- **69 khung hình dự kiến**.
- **0 ảnh đã thu**, 0 điểm khống chế và 0 reality mesh khảo sát.

Góc nhìn **11 / Ground Capture 07C** hiển thị trạm camera, tia nhìn ba cao độ, vành phân tích góc phủ và mô phỏng lần lượt từng trạm. Mô phỏng không ghi ảnh và không làm thay đổi số liệu thu thập.

Ảnh kiểm chứng `poc-seven-c-groundcapture.png` ghi nhận lớp kế hoạch đang hoạt động tại **100 FPS**, 135 draw call và 2.345.613 tam giác trên máy kiểm thử tại thời điểm chụp. Metrics xác nhận 23 trạm, 69 khung dự kiến, 0 ảnh đã thu và `accessVerified: false`.

## Giới hạn thực địa

Các vị trí chỉ là ứng viên lấy từ snapshot bản đồ. Quyền tiếp cận, vỉa hè đang thi công, cây che, luồng người, an toàn giao thông và khả năng nhìn thấy mặt đứng phải được xác minh tại hiện trường. Mô hình mặt đất không thể khép kín phần mái trên của tháp; phần đó cần ảnh từ vị trí cao hoặc UAV hợp pháp.

## Tệp tạo ra

- `hcmc-poc/data/ground-capture-plan.json`: manifest kế hoạch đầy đủ.
- `hcmc-poc/data/ground-capture-plan.js`: bản nhúng cho giao diện.
- `hcmc-poc/scripts/build_ground_capture_plan.py`: builder tái lập.
- `hcmc-poc/scripts/validate_ground_capture_plan.py`: validator fail-loud.
- `hcmc-poc/research/ground-capture-07c-validation.json`: kết quả kiểm định.
- `hcmc-poc/ground-capture-07c.js`: lớp hiển thị và mô phỏng.

## Quy trình thu đề xuất

Tại mỗi trạm, khóa tiêu cự, phơi sáng và cân bằng trắng; chụp ba dải cao độ với chồng phủ mục tiêu 70%. Giữ ảnh gốc cùng EXIF, tên trạm và ghi chú vật cản. Bổ sung ít nhất một thước chuẩn hoặc khoảng cách đã đo để giải quyết scale. Không dùng các ảnh thiếu quyền tái sử dụng trong pipeline bàn giao.

Sau khi có ảnh, 07D sẽ chạy kiểm tra EXIF, độ nét, chồng phủ và provenance trước khi đưa vào COLMAP/photogrammetry hoặc Gaussian Splatting. GLB kết quả sẽ thay nội dung `rp-r2c3` qua hot-swap đã hoàn thành ở 07B.
