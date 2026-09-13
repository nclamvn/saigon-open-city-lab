# TIP-16C-RENDER — mặt ảnh Times Square bị thanh trắng xuyên qua

User báo screenshot mặt ảnh xanh có hai thanh ngang và vệt dọc trắng. Contractor duyệt sửa tận gốc xung đột lớp trang trí minh họa/phủ ảnh; Builder không đổi hình khối, chiều cao hoặc ảnh nguồn.

## Root cause

Target `times`, OSM165491082. `architecture.js` dựng mullion dày 0,32 m, mặt ngoài ở 0,16 m đúng bằng mặt ảnh → coplanar depth fighting. `reality-enrichment-13.js` dựng ledge dày 0,72–1 m, fin 0,68 m → thật sự nhô xuyên mặt ảnh 0,16 m. Photo crop chỉ vùng vertical0,48–0,98; phần khối nền ngoài crop vẫn là minh họa, không được tự kéo ảnh phủ hết công trình.

## Triển khai

- Gắn building_id cho instance trang trí; chỉ lớp instance đúng target có photo_patch hợp lệ tham gia clipping.
- Clip fragment trang trí trong cùng dải cạnh, cao độ, UV và alpha coverage của ảnh. Không tắt depthTest, không đẩy cả ảnh ra ngoài.
- Giữ phần ngoài crop và vùng ảnh bị mask; A/B hoặc ra ngoài cutoff2500 m tự trả trang trí đầy đủ.
- Shadow depth material dùng cùng clipping, không để bóng thanh giả còn trên ảnh.
- Không đổi nguồn/atlas/height/UV baseline. Giữ nhánh tối ưu16b.

## Acceptance

AC1: từ metadata Times, xác nhận mullion coplanar và hai ledge nằm trong photo coverage.
AC2: shader chỉ discard đúng building/strip/height/alpha; outside/corner/rear/held/envelope không bị clip.
AC3: A/B, audit, atlas readiness, distance gate đồng nhất photo group; bật/tắt không sửa instance matrix.
AC4: depth/shadow clipping đồng nhất; không depthTestfalse, offset0,16m giữ nguyên.
AC5: validator15 và performance16b vẫn PASS; syntax/standalone gồm module mới.
AC6: Contractor screenshot trước/sau, góc xiên và A/B xác nhận không còn vệt trắng/thanh xuyên; giới hạn crop/độ phân giải vẫn công khai.
