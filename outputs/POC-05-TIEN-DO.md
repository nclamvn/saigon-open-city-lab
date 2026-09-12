# PoC 05 — Landmark 81, không gian trung tâm và ánh sáng HDRI

Ngày 11/09/2026. Bản chạy: http://127.0.0.1:8768/hcmc-poc/.

## Kết quả đồ họa

Landmark 81 có lớp chi tiết minh họa mới gồm đai ngang theo cụm năm tầng, cạnh đứng, các tầng mái chuyển tiếp, mast đỉnh và đèn hiệu. Hình khối nền vẫn là bó chín tháp gần đúng đã dựng từ footprint mở. Góc nhìn **Landmark 81 · cận cảnh** được thêm để đánh giá hình khối ở khoảng cách 710 m.

Không gian Nguyễn Huệ–Bạch Đằng có lớp cột đèn, dải promenade, trục nước và vòi phun minh họa. Góc nhìn thứ bảy đặt camera theo trục đô thị để thấy quan hệ giữa Nguyễn Huệ, Bitexco và bờ sông. Những vật thể này không phải hồ sơ thiết kế cảnh quan hoặc khảo sát hiện trạng.

Bóng tiếp xúc được thêm dưới các công trình cao trong bán kính 2,3 km quanh trung tâm. Đây là decal elip trong suốt giúp công trình bám đất hơn, không phải ambient occlusion hay ray tracing vật lý.

## PBR và HDRI

Môi trường phản xạ vật liệu sử dụng **Venice Sunset 1K HDR** của Greg Zaal trên Poly Haven, giấy phép CC0. Tệp HDR 1.440.400 byte khớp MD5 `a5ec4d30fc3421c214a17b208fb66d5f` do API công bố và SHA256 được lưu trong `hcmc-poc/data/hdri-provenance.json`.

HDRI chỉ cung cấp image-based lighting cho vật liệu kính và kim loại. Nó không xuất hiện làm ảnh nền và không được mô tả như bầu trời hoặc quang cảnh TP.HCM. Người xem có thể bật/tắt HDRI trong bảng **Đồ họa nâng cao** để so sánh với môi trường gradient tổng hợp trước đó.

Mô hình vẫn dùng ACES tone mapping, vật liệu PBR, ánh sáng bán cầu, mặt trời định hướng và phản xạ phẳng trên sông. Các lớp mới có công tắc riêng: mặt đứng, bóng tiếp xúc, Landmark 81, Nguyễn Huệ–Bạch Đằng, phản xạ sông và HDRI.

## Kiểm tra

Hai ảnh WebGL có attribution và JSON hiệu năng đã được lưu:

- `poc-five-landmarkclose-golden.png`: 70.719 khối, 9.791 cây, HDRI tải và bật, phản xạ 768² bật; quan sát 120 FPS ở lần lưu.
- `poc-five-realmclose-golden.png`: cùng cấu hình, quan sát 122 FPS ở lần lưu.

Các con số FPS là ảnh chụp tức thời trong trình duyệt kiểm tra nền và không đại diện thiết bị khác. Đã kiểm tra cú pháp toàn bộ JavaScript, checksum HDRI, hai góc nhìn, trạng thái tải HDRI và bảng điều khiển thu gọn.

## Giới hạn và bước tiếp theo

Các mặt đứng vẫn là quy tắc lặp; ảnh vệ tinh lịch sử vỡ chi tiết khi xuống gần mặt phố. Landmark 81 đã dễ nhận diện hơn nhưng chưa phải BIM, photogrammetry hoặc mô hình kiến trúc được đo. Chất lượng chân thực cận cảnh tiếp theo phụ thuộc vào bộ ảnh có quyền sử dụng.

Bước kế tiếp phù hợp là chuẩn bị **hero capture package**: flight card, yêu cầu camera, lưới đường bay và gate kiểm định cho một cụm nhỏ; đồng thời tách cảnh theo tile/LOD để sẵn sàng nhúng photogrammetry hoặc Gaussian Splatting mà không làm nặng toàn thành phố.
