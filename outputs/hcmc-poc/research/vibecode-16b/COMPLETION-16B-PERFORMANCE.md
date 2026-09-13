# Completion — TIP-16B-PERFORMANCE

Builder implementation: **DONE — READY with measured limits**. Contractor đã đo Chrome cùng view Sun Wah, viewport 1671×907, DPR 2 và kiểm tra tương tác. Không tuyên bố tăng FPS.

## Vấn đề và thay đổi

Code cũ chọn PoC6 Ultra khi nạp: DPR tối đa 2, bóng 4096² tự vẽ lại mỗi frame, phản xạ 1024² mỗi 2 frame. Giao diện nhãn trộn ghi CSS và đọc kích thước gây layout work; các HUD nguồn serialize cùng trạng thái mỗi frame. `advanceFacades15` chỉ scan mảng hình học khi trạng thái chiều cao đổi, không phải vòng lặp nặng thường trực.

- `performance-16b.js`: telemetry baseline/optimized, frame cadence p50/p95/p99, rolling FPS, CPU submission, module timing, draw calls/triangles của các render passes, reflection/shadow counts, DPR và camera. `#performance16bStatus[data-json]` ẩn khỏi UI lãnh đạo.
- Cache shadow map; refresh theo framing/light/geometry hoặc 750 ms idle, 180–250 ms khi di chuyển. Bóng không bị tắt, geometry giữ nguyên.
- Phản xạ theo thời gian: 250 ms idle, 150 ms khi di chuyển; ảnh phản xạ vẫn chiếu bằng ma trận đã render. Giảm buffer về 512² tạm thời khi di chuyển rồi khôi phục kích thước yêu cầu.
- DPR tạm tối đa 1,25 trong tương tác, khôi phục DPR yêu cầu sau khi camera yên 450 ms. Không gọi resize nếu DPR không đổi. `body.city-interacting` cho UI giảm blur.
- Nhãn cache kích thước và đọc trước ghi; các JSON HUD không ghi lại khi chuỗi không đổi.
- Smoothing `1-exp(-4.033*dt)` giữ tốc độ theo thời gian; camera chỉ kết thúc khi cả vị trí lẫn góc đạt ngưỡng.
- Optimized không giữ drawing buffer lâu dài; nút lưu ảnh render đồng bộ ngay trước đọc canvas.
- `?perf=baseline` giữ DPR/shadow/reflection/smoothing/preserveDrawingBuffer cũ để đo đối chiếu. Telemetry có thêm overhead nhỏ ở cả hai nhánh.

## Kiểm thử đã chạy

- `node scripts/validate_performance_16b.cjs`: 8/8 PASS — baseline giữ cấu hình, transient quality và khôi phục, shadow invalidation, reflection cadence, telemetry hữu hạn, easing 15/60 FPS tương đương.
- `node --check`: performance16b, app, river-reflection PASS.
- `python3 scripts/validate_demo_ready.py`: 19/19 PASS sau cập nhật expected app cache16b.
- `python3 scripts/validate_facades_15.py`: PASS — source/atlas/geometry anchoring và regression fixtures giữ nguyên.
- Chưa có GPU benchmark bằng test mô phỏng. CPU submission không phải thời gian GPU. FPS phải lấy từ browser cùng điều kiện.

## AC / bàn giao

AC1–6 triển khai; behavioral checks và browser evidence bên dưới đã được Contractor cung cấp. `package_single.py` tự inline module theo index; Contractor chạy package sau khi nhánh UI xong để không đóng gói bản cũ.

Tệp runtime sửa: app.js, river-reflection.js, poc6-maximum.js, photo-facades-15.js, surface-realism-14.js, index.html. Thêm performance-16b.js và scripts/validate_performance_16b.cjs. Không đổi leadership UI, scene data, nguồn ảnh, atlas, hình học hoặc thư viện.

Giới hạn: cadence bóng xe/tàu và phản xạ thấp hơn; DPR chỉ giảm trong tương tác. Model 70.719 khối vẫn là single merged city mesh, chưa spatial chunking/streaming; nếu GPU vẫn chậm ở idle native DPR, bước sau cần phân ô giữ mapping/picking và đo ngân sách shader/overdraw, không tự giảm hết chất lượng.

## Bổ sung kiểm tra đường lưu ảnh

`capture-path-review.json`: 4/4 source-order checks PASS. Render ngày/đêm và sao chép canvas đồng bộ trong cùng handler; PNG được mã hóa trước await. Postprocess đêm trả render target về màn hình trước copy. Lịch sử 20 lần chuyển chất lượng gần nhất trong telemetry cho phép đối chiếu DPR tạm và DPR khôi phục mà không poll dày. Browser hidden-tab vẫn dùng cơ chế RAF của trình duyệt, không thêm forced pause.

## Kết quả browser do Contractor cung cấp

| Chrome, Sun Wah, 1671×907, DPR2 | Baseline | Optimized |
|---|---:|---:|
| CPU frame (ms) | 7,77 | 3,94 |
| CPU render submission (ms) | 6,71 | 3,08 |
| Draw calls/frame trung bình | 78,5 | 55,8 |
| Triangles/pass tổng trung bình | 3.822.859 | 2.691.580 |
| Rolling FPS | 68,1 | 65,9 |
| Frame p95 (ms) | 25 | 23,7 |

CPU/frame giảm khoảng 49%, draw calls giảm khoảng 29%; số triangles giảm do ít pass hơn, không do bỏ hình học. FPS không tăng trong phép đo này. Đây là CPU submission và frame cadence ở thiết bị/trình duyệt đã thử, không đo GPU duration hoặc cam kết mọi thiết bị.

Chrome ghi lịch sử Sun Wah → Landmark: tại 1.802 ms DPR 1,25/phản xạ 512 khi di chuyển; tại 6.410 ms khôi phục DPR2/phản xạ1024, qualityRestored=true. Contractor không thấy lỗi mới. iAB không dùng để tuyên bố FPS vì có hoạt động Chrome đồng thời.

Acceptance cuối: 6/6 yêu cầu phạm vi performance được triển khai/kiểm tra; phản hồi điều khiển và chuyển chất lượng đã kiểm tra browser. Các giới hạn kiến trúc single merged mesh, cadence phản xạ/bóng và precision dữ liệu vẫn được giữ nguyên như mô tả.
