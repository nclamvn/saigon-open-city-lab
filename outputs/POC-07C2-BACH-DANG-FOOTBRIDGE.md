# PoC 07C.2 — Hiệu chỉnh cầu đi bộ Bạch Đằng–Thủ Thiêm

## Nhận diện lại công trình

Cầu Ba Son và cầu đi bộ Bạch Đằng–Thủ Thiêm là hai công trình riêng. Cầu Ba Son nằm phía bắc và đã khai thác. Cầu đi bộ nằm giữa cầu Ba Son và hầm sông Sài Gòn, nối Công viên Bến Bạch Đằng với Công viên bờ sông Thủ Thiêm.

Snapshot OpenStreetMap của PoC ghi bốn đoạn tim tuyến cầu đi bộ với các ID `1504289918`, `1504289919`, `1504289920`, `1504289921`; tất cả đều mang bộ thẻ `highway=construction`, `construction=footway`, `bridge=yes`.

## Trạng thái và thiết kế được kiểm chứng

[Cổng Thông tin điện tử TP.HCM](https://tphcm.chinhphu.vn/khoi-cong-xay-dung-cau-di-bo-qua-song-sai-gon-101250329111018964.htm) công bố tuyến dài khoảng 720 m, rộng 6–11 m, nhịp chính 187 m, tĩnh không 80 × 10 m và kết cấu vòm thép không gian mang hình lá dừa nước.

[VOV ngày 25/8/2026](https://vov.gov.vn/cau-di-bo-qua-song-sai-gon-lo-hen-dip-29-dtnew-1161022?keyDevice=true) cho biết kế hoạch lai dắt và lắp nhịp chính bị lùi; tại thời điểm đó nhịp vòm chính chưa được đưa về công trường.

## Quy tắc render

- Hạng mục đang xây được biểu diễn bằng vật liệu đặc.
- Nhịp chính và vòm lá dừa nước chưa lắp được biểu diễn bằng vật liệu trắng bán trong suốt.
- Hai trụ chính đặt gần bờ để giữ vùng tĩnh không thông thuyền ở giữa.
- Góc nhìn số 13 và HUD luôn ghi rõ `ĐANG THI CÔNG` và `CHƯA KHAI THÁC`.
- Cầu Ba Son được giữ thành lớp riêng ở góc nhìn số 12.

## Giới hạn

Tim tuyến lấy từ OSM; hình học vòm và cấu kiện là diễn giải cách điệu từ phương án kiến trúc được duyệt. Không có đo đạc công trường, bản vẽ thi công hoặc mô hình BIM. Lớp này không dùng cho dẫn đường UAV, thi công hay phân tích kết cấu.
