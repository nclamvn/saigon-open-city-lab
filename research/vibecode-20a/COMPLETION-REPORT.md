# Completion Report — Batch 20A

**STATUS:** READY

## Kết quả

- Một hero view riêng tại Nhà hát Thành phố, neo vào building `801710792` và hai dải mặt đứng đã lưu.
- Vỏ kiến trúc có khối mái, mansard, vòm, cột, cửa, phào, bậc, lan can, ô cửa và chi tiết nổi.
- Ảnh đúng địa điểm chỉ xuất hiện trong vùng vòm trung tâm có hình học đỡ; không phủ toàn khối nhà.
- Lớp nhận dạng dùng bản gốc Wikimedia Commons 3.920×2.208 px và texture hiệu chỉnh phối cảnh 1.600×1.600 px; nguồn, hash, phép biến đổi và giấy phép được lưu trong receipt.
- Vật liệu stucco/slate thủ tục, public-realm proxy, người và cây có LOD cự ly gần.
- Ba ánh sáng ngày, giờ vàng, chạng vạng giữ chung camera.
- Cảnh 3 và 4 của trailer dùng cùng hero background; cảnh 4 thêm ảnh nguồn cùng tác giả, ngày và giấy phép.
- Giao diện Khám phá có điểm vào một thao tác.

## Phân loại

- Vị trí: `open_data_mapped_facade`.
- Ảnh nhận dạng: `sourced_site_photo`.
- Kiến trúc: `photo_derived_approximation`.
- Không gian công cộng: `illustrative_proxy`.
- Ánh sáng: `illustrative_cinematic`.
- `planningGeometryEnabled: false`.

## Giới hạn

Ảnh nguồn đã được nâng từ thumbnail 1.280×721 lên đúng bản gốc Commons 3.920×2.208; texture hiệu chỉnh tăng từ 500×500 lên 1.600×1.600 mà không inpainting hoặc sinh thêm pixel. Một ảnh xiên đơn vẫn không thể cung cấp mặt khuất hay hình học khảo sát như multi-view SfM/LiDAR. Bao cao 26 m chưa phải số đo khảo sát.

## Kiểm thử

- `node research/vibecode-20a/qa/verify-hero-zone.mjs`: 19/19 PASS.
- JavaScript syntax: PASS. `git diff --check`: PASS.
- Browser QA: deep link, ba mood, cảnh 3–4 trong trailer và khôi phục chất lượng sau chuyển camera: PASS.
- Runtime error probe: 0 lỗi.
- Phép đo in-app browser 894×998 ở hero view đã dừng: 88,8 FPS rolling; p95 16,7 ms; CPU frame 1,96 ms; 222,9 draw calls và khoảng 2,675 triệu triangle. Đây là số đo của máy/viewport hiện tại, không phải cam kết cho mọi thiết bị.

## Bước mở rộng đúng

Đưa thêm ảnh nghiêng độ phân giải cao có quyền sử dụng cho toàn khối Nhà hát, Continental và Caravelle; dùng camera calibration + multi-view reconstruction để thay từng phần `photo_derived_approximation` bằng mesh/texture đã đo kiểm. Khi có payload, cùng manifest nhận orthomosaic, oblique imagery, point cloud/LiDAR mà không đổi hợp đồng phân loại nguồn.
