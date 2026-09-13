# Completion — TIP-16D-TIMES

**DONE — READY với giới hạn dữ liệu đã công bố.** Contractor đã chấp nhận hình ảnh R2: cả7mặt vỏ liền mạch bằng texture nguồn, chữ Times Square được giữ nguyên và đọc được.

## Thay đổi cuối cùng

- Original Commons2388×3490, Steffen Schmitz,16/01/2020,CC BY-SA4.0 giữ nguyên hash/receipt. Không dùng ảnh giai đoạn thi công.
- Texture riêng1024×1856 của mặt phẳng chính chứa trọn chữ gốc. Sky mask2,656% giữ nguyên vùng chữ/logo; không vẽ font mới.
- Một material thống nhất roughness0,86/metalness0/env0,25 trên7mặt footprint hiện có. Dưới vùng ảnh, dải không chữ1024×512 tiếp tục đúng các cột; mặt khác dùng mẫu kính115×480 theo tỷ lệ vật lý. Không lặp ảnh chứa logo.
- Vỏ suy dựng được ghi rõ trong source information. Không sửa footprint, chiều cao hay hình học nền; thêm bề mặt vật liệu cách nền0,16m.
- Generic mullions/ledges/fins/awnings của đúng Times được tắt khi vỏ ảnh bật; A/B/audit trả trạng thái bằng uniform, không sửa instance matrices. Clipping và shadow16c giữ gate tương ứng.
- Sửa zoom đọc chữ: wheel và phím+ có giới hạn gần35m trong viewfacades; viewkhác giữ250m. Zoom-in từ150m không còn nhảy ra250m.

## Requirement coverage

5/5AC phạm vi Times hoàn thành. Kiểm tra dữ liệu/runtime và hình ảnh do Contractor đối chiếu; không diễn giải thành độ chính xác đo đạc của công trình.

## Validation

| Kiểm tra | Kết quả |
|---|---:|
| validate_times_16d.py — hash, nguồn, tỷ lệ, mask chữ, không lặp logo, material thống nhất |13/13PASS|
| validate_photo_occlusion_16c.cjs |9/9PASS|
| validate_performance_16b.cjs |8/8PASS|
| validate_demo_ready.py |19/19PASS|
| validate_facade_zoom_16d.cjs — thực thi biểu thức hai handler |6/6PASS|
| validate_facades_15.py |PASS|
| Node syntax runtime/app |PASS|
| Browser R2 — texture liền7mặt và chữ gốc |Contractor ACCEPT|

Capture15b cũ không được tính thành QA16d. Không tuyên bố tăngFPS ở đợt này.

## Bàn giao

- scripts/build_times_16d.py; assets/facades16d/times-front.jpg,times-mask.png,times-sign-free-extension.jpg,times-glass-sample.jpg.
- data/times-facade-16d.js; times-facade-16d.js; metadata Times/atlas fallback15; clipping16c và thông tin nguồn tương ứng.
- app.js zoom chỉ viewfacades; index cache và standalone SAIGON-3D.html được cập nhật.

Giới hạn: ảnh nguồn không nhìn thấy phần thân dưới và các mặt khuất. Texture nối phía dưới và các mặt khác là suy dựng từ mẫu ảnh; vị trí/cao độ ảnh chưa có điểm đo khống chế. Vỏ nhìn liền mạch không có nghĩa toàn vỏ là photogrammetry hoặc hiện trạng đã khảo sát.
