# PoC 06 — Visual Ceiling

PoC 06 đẩy pipeline WebGL hiện tại tới giới hạn trình diễn hợp lý mà không thay nền dữ liệu. Mô hình vẫn gồm 70.719 khối trên 38,57 km²; hình học, chiều cao và các lớp minh họa giữ nguyên trạng thái nguồn của các PoC trước.

## Nâng cấp hình ảnh

- Bầu trời khí quyển sinh bằng shader, thay đổi liên tục từ ban ngày tới chạng vạng; không dùng ảnh địa điểm khác làm cảnh nền TP.HCM.
- Chế độ **Ultra** nâng pixel ratio tới 2×, shadow map 4096², phản xạ sông 1024² mỗi hai khung hình và bật toàn bộ chuyển động đô thị.
- Chế độ **Balanced** giảm pixel ratio, bóng và phản xạ để dùng trên GPU tích hợp.
- Shadow frustum bám theo mục tiêu camera, giúp bóng ở góc cận cảnh dùng hiệu quả hơn độ phân giải sẵn có.
- Vật liệu kính, nước và chi tiết mặt đứng nhận ánh sáng HDRI mạnh hơn; môi trường IBL vẫn là Venice Sunset 1K của Poly Haven, giấy phép CC0.
- 360 xe và 14 tàu thuyền chuyển động là lớp ngữ cảnh minh họa. Tuyến xe lấy từ linework đường đã lập bản đồ, loại đoạn cắt footprint công trình hoặc mảng xanh và giữ xe cách đầu đoạn; vị trí và lưu lượng không phải dữ liệu giao thông.
- Tàu đi theo tim sông dạng polyline tám điểm và chỉ lệch làn ±8 m. Audit chạy trong trình duyệt kiểm tra 3.003 mẫu trên ba làn: 0 mẫu nằm ngoài polygon mặt nước.
- Beacon Landmark 81 và góc máy **08 / Showcase ven sông** bổ sung nhịp trình diễn vào chạng vạng.

## Giới hạn đã chạm

Pipeline này có thể làm hình thái đô thị thuyết phục ở tầm vĩ mô và trung cảnh. Nó không thể tự sinh mặt đứng đúng hiện trạng, địa hình cao độ chính xác, cây và nội thất đường phố đúng vị trí, hoặc hình học landmark đạt cấp BIM. Nâng tiếp polygon, decal và hiệu ứng tổng hợp sẽ tăng tải nhanh hơn mức tăng độ tin cậy.

Bước vượt trần cần thay nguồn đầu vào: ảnh xiên/photogrammetry hoặc Gaussian Splatting cho vùng hero; DSM/DTM và chiều cao đã kiểm định; ảnh mặt đứng có quyền sử dụng; dữ liệu vật cản và mặt đường phù hợp bài toán UAV.

## Cách kiểm tra

1. Chọn **08 / Showcase ven sông**.
2. Mở **Đồ họa nâng cao**, giữ **Chất lượng Ultra · PoC 06** bật.
3. Kéo thanh ánh sáng tới 60–80% để quan sát khí quyển, cửa sổ, beacon và đèn xe.
4. Tắt Ultra để so sánh chế độ Balanced và theo dõi FPS/phản xạ ở góc dưới phải.

Mọi con số FPS chỉ là quan sát tức thời trên máy kiểm tra, không phải benchmark phần cứng chung.

Ảnh kiểm chứng `poc-six-showcase-golden.png` ghi nhận ở lần lưu cuối: 70.719 khối, 360 xe, 14 tàu, 56 draw call, khoảng 2,33 triệu tam giác, HDRI bật và phản xạ 1024² mỗi hai khung. Metrics đi kèm xác nhận 360/360 đoạn xe đạt bộ lọc hành lang và 3.003/3.003 mẫu tàu nằm trong mặt nước. Tốc độ quan sát được lưu trong tệp metrics đi kèm.
