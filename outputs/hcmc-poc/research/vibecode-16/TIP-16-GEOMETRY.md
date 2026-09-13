# TIP-16-GEOMETRY — kiểm kê mức sẵn sàng hình học

Vai trò: Builder kiểm toán dữ liệu theo Vibecode Kit; Contractor duyệt phạm vi. Ngày 13/09/2026.
Ưu tiên: P0. Phụ thuộc: manifest/selections/scene và runtime PoC 15b hiện có.

## Yêu cầu

1. Kiểm kê đủ 20 target, nguồn ảnh, ngày chụp, giấy phép, nguồn footprint, chiều cao nền và override.
2. Phân biệt eligibility của phép phủ ảnh với độ chính xác đo đạc; xác nhận quy tắc và số lượng từ dữ liệu.
3. Xác định giới hạn CRS/nền đất/chiều cao/LOD và năm ưu tiên tiếp theo có chứng cứ.
4. Chạy validator đang có, ghi rõ giới hạn capture cùng phiên bản.
5. Không chỉnh hình học, vật liệu, ảnh, cao độ hoặc code runtime; không thêm UAV.
6. **Scope bổ sung được Contractor duyệt:** sửa đúng hai metadata `mapping_basis` nhầm OSM ở Union Square/Continental thành Overture, đồng bộ selections → manifest → bundle. Không tái tạo ảnh.

## Kịch bản chấp nhận

- AC1: Given 20 target, when join theo building_id, then đủ 20 target có bản ghi nền và nguồn ảnh/giấy phép.
- AC2: Given review và normals, when chạy validator, then eligibility được tính theo accepted + planar + normal spread ≤ 5°, không gắn nhãn đo đạc.
- AC3: Given entry held có height_override, when báo cáo chiều cao hiệu lực, then giữ chiều cao nền, không báo override chưa bật.
- AC4: Given scene và prepare_scene.py, when kiểm kê, then số quality được tính lại và ghi nền phẳng/local display projection.
- AC5: Given metadata Union/Continental, when đọc cả 3 tầng dữ liệu, then origin Overture nhất quán và atlas/source hashes vẫn qua validator.
- AC6: Given capture PoC 15b, when báo cáo QA, then chỉ tính capture cùng phiên bản, không nhận capture cũ là kiểm thử mới.
- AC7: Given các thiếu hụt, when bàn giao, then có hành động ưu tiên từng công trình và top 5 nâng cấp; không tự tạo hình học thay thế.

Tệp bàn giao: SCAN-GEOMETRY.md, geometry-readiness.json, COMPLETION-GEOMETRY.md. Không commit/push.
