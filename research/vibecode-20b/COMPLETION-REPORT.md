# Completion Report — Batch 20B

**STATUS:** READY

## Kết quả

- Cụm hero gồm năm góc: toàn cụm, Continental, Caravelle, Lam Sơn và Đồng Khởi.
- Continental dùng ảnh gốc 5.472×3.648 px, texture 2.048×2.048 px, bao 24 m và chi tiết phào/lan can photo-derived.
- Caravelle tách cánh thấp có ảnh khỏi tháp 24 tầng; quy tắc hiển thị 3,2 m/tầng được đánh dấu chưa khảo sát.
- Sáu đoạn đường OSM điều khiển mặt đường và chuyển động của tám xe proxy.
- Góc Continental chuyển sang hành lang nhìn xiên; góc Đồng Khởi nhìn theo trục đường. Hai góc không còn đặt camera trong khối nhà.
- HUD kính có năm điểm nhìn, nguồn tại chỗ và hành trình 38 giây.
- Trailer lãnh đạo được mở thành bảy cảnh/62 giây với hai cảnh ảnh nguồn Continental và Caravelle.
- Module 20A và 20B chia quyền điều khiển FOV để không còn giật hoặc hội tụ sai ống kính.

## Tính trung thực

- Anchor: Opera `801710792`, Continental `2000032897`, Caravelle `39598465`.
- Ảnh: Commons có tác giả, ngày, giấy phép, pixel gốc và SHA-256 trong `asset-receipt.json`.
- Caravelle 24 tầng: nguồn lịch sử chính thức của khách sạn.
- Đường: sáu OSM source IDs đã lưu trong scene.
- Hình học kiến trúc bổ sung: `photo_derived_approximation` hoặc `display_rule_not_surveyed`.
- Cây, đèn, bề rộng phố và xe: `illustrative`.
- `planningGeometryEnabled: false`.

## Kiểm thử

- `node research/vibecode-20b/qa/verify-hero-cluster.mjs`: toàn bộ phép kiểm PASS.
- JavaScript syntax và `git diff --check`: PASS.
- Browser QA: năm deep link/HUD view, ảnh tải xong, không có lỗi runtime và trailer bảy cảnh: PASS.
- Đo tại 1.280×720, DPR 2, cảnh cụm đã dừng: 120 FPS rolling, p95 9,2 ms, CPU frame 1,91 ms, khoảng 235 draw calls và 2,65 triệu triangle. Số đo chỉ đại diện máy và viewport kiểm thử.

## Giới hạn còn lại

Mỗi công trình mới chỉ có một ảnh nên mặt khuất, mái và chiều sâu chưa phải khảo sát. Caravelle tower là mô hình trình diễn từ số tầng chính thức, không phải geometry as-built. Mặt đường và cảnh quan giữ vai trò định hướng thị giác; cần ảnh xiên đa góc, camera calibration, point cloud/LiDAR hoặc hồ sơ BIM/CAD đã kiểm chứng để nâng lên LoD3.
