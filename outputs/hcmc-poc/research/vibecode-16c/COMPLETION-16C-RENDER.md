# Completion — TIP-16C-RENDER

Builder code **DONE; chờ Contractor xác nhận ảnh trước/sau, góc xiên và A/B**. Không thay source photo, atlas, height hoặc geometry nền.

## Thay đổi

- `architecture.js` và `reality-enrichment-13.js`: thêm building_id vào metadata instance, đăng ký bốn lớp trang trí architecture/ledges/fins/awnings để phân biệt chủ thể.
- `photo-facades-15.js`: công khai resource material/group để dùng đúng alpha mask và visibility gate hiện có.
- `photo-occlusion-16c.js`: mỗi instance được gắn slot công trình; shader chỉ bỏ fragment trang trí nằm trong dải/cao độ/UV/alpha mask ảnh của đúng target. Vùng ngoài crop, phía sau nhà và mask holes giữ nguyên. Shadow depth material dùng cùng clipping. Offset0,16m và depth test thông thường giữ nguyên.
- Chỉ 14 planar photo patches / 16 strips; 5 held và VCB sampled envelope không tham gia. Không sửa instance matrices để A/B tự trả đúng trạng thái.
- `#photoOcclusion16cStatus[data-json]` ẩn, chứa số instance theo target/layer và gate hiện hành. Không thêm UI lãnh đạo.

## Kiểm chứng

- `validate_photo_occlusion_16c.cjs`: **9/9 PASS**, actual Three.js và Times Square metadata. Hai ledge thật từ công thức cũ ở trong crop; mặt ngoài mullion trùng photo plane. Kiểm tra outside/behind/mask/held/A-B/readiness/shadow/depth.
- `validate_facades_15.py`: PASS; nguồn, atlas, neo footprint và regression chiều cao giữ nguyên. Không coi 3 archived capture15b là QA16c mới.
- `validate_performance_16b.cjs`: **8/8 PASS**.
- `validate_demo_ready.py`: **19/19 PASS**; syntax các module sửa PASS.
- Shader phải được biên dịch bằng WebGL và nhìn bằng browser; test CPU không thay thế screenshot.

AC1–5 có code/test; AC6 và phần nhìn của AC2–4 chờ Contractor. Standalone tự inline theo index; đóng gói sau khi xác nhận shader/ảnh.

Giới hạn: ảnh Times chỉ phủ cao độ tương đối0,48–0,98, nên phần nền ngoài vùng chụp vẫn khác vật liệu. Ảnh500px có giới hạn độ nét, không được kéo giãn sang phần không quan sát hoặc gọi toàn công trình là hình học thực. Clipping không làm dữ liệu ảnh chính xác hơn; nó loại trang trí thủ tục đã xung đột với vùng ảnh có nguồn.
