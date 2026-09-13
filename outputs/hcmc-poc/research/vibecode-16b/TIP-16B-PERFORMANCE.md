# TIP-16B-PERFORMANCE

User: sửa giật/lag khi thao tác bản đồ. Builder runtime; Contractor đo browser baseline và kết quả. UI thuộc Builder khác.

## Phạm vi

1. Telemetry baseline trước tối ưu: RAF p50/p95/p99, CPU mỗi frame/render/module, draw calls/triangles của mọi pass, reflection passes, DPR. DOM read-only `#performance16bStatus[data-json]`.
2. Tối ưu đường nóng có chứng cứ, giữ nguyên dữ liệu hình học/nguồn và chức năng đối chiếu.
3. Camera smoothing độc lập tốc độ khung hình, giảm chi phí tương tác tạm thời và khôi phục khi dừng.
4. Chế độ `perf=baseline` giữ đường render trước tối ưu để đo cùng view/viewport. Không hứa FPS nếu chưa đo.
5. `body.city-interacting` phối hợp UI giảm blur; telemetry không hiển thị trên giao diện trình lãnh đạo.
6. Không framework mới, không GPU timing giả. Build standalone và validate phù hợp.

## Acceptance

- AC1 baseline DOM có số finite và profile module; báo rõ CPU submission khác GPU time.
- AC2 same-view measurements được lưu trước/sau, không trộn viewport/quality khác mà không ghi rõ.
- AC3 pan/zoom/rotation/transition vẫn hoạt động; chất lượng động khôi phục có giới hạn sau idle.
- AC4 đổ bóng/phản xạ vẫn có và cập nhật theo thay đổi; không bỏ toàn bộ scene hoặc geometry để tăng FPS.
- AC5 render baseline toggle giữ nguyên đường cũ; các tối ưu được ghi cụ thể và có syntax/validator checks.
- AC6 telemetry/research giữ ngoài UI lãnh đạo; standalone bao gồm module.

Tối ưu chọn sau baseline. Build→QA→Refine dựa trên số đo, mọi giới hạn ghi Completion.
