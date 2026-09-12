# PoC 12 — Cinematic Night & Map-first UI

PoC 12 đẩy bản dựng hiện tại tới trần trình diễn realtime bằng hai thay đổi đi cùng nhau: một cảnh blue hour có hậu kỳ điện ảnh và một kiến trúc giao diện ưu tiên bản đồ. Đây vẫn là mô hình thủ tục từ dữ liệu mở, chưa phải ảnh đo thực địa hay bản sao số đã khảo sát.

## Kết quả giao diện

- Màn hình mặc định chỉ giữ ba nút nhỏ: **Góc nhìn**, **Trình diễn**, **Thông tin**.
- Ba ngăn loại trừ lẫn nhau; chọn một góc nhìn hoặc chạm bản đồ sẽ đóng ngăn đang mở.
- Giới thiệu dài, danh sách 18 view, bộ điều khiển và bảng thông tin kỹ thuật không còn cùng xuất hiện trên bản đồ.
- Mỗi HUD theo view có nút `−/＋` để thu gọn hoặc mở rộng.
- Điều hướng bàn phím: mũi tên/WASD dịch chuyển theo hướng camera, Q/E xoay và +/- zoom; phím không chiếm quyền khi người dùng đang thao tác input hoặc button.
- Bố cục dọc dùng chiều rộng khả dụng, giới hạn chiều cao và cuộn nội bộ nên không còn chồng chữ như ảnh lỗi ban đầu.
- Các lớp Reality Patch, Reality Tile, Ground Capture và kết cấu cầu chỉ hiện trong view tương ứng.

## Lớp thị giác PoC 12

- Pipeline hậu kỳ gồm render cảnh, tách vùng sáng, blur ngang, blur dọc và composite; composite áp bloom, color grade, vignette và grain.
- 220 vệt đèn chuyển động bám các hành lang xe đã qua kiểm tra hình học ở PoC 06.
- 116 điểm sáng skyline được gom trong một draw call.
- Mặt đường ẩm được sinh từ tim đường primary/secondary/tertiary đã có trong mô hình; bản chụp cuối ghi nhận 7.666 tam giác lớp đường này.
- Camera Director dài 45 giây, gồm 5 cảnh: Bạch Đằng, Bitexco, Nguyễn Huệ, Ba Son và Landmark 81.
- Hai mức **Cinematic** và **Balanced**, cùng thanh Bloom, Color grade và nút lưu PNG.
- Gradient bầu trời trong composite lấp vùng nền trống, loại bỏ đường cắt tối ở mép trên cảnh.

## Tinh chỉnh ánh sáng và Bitexco — 12.1

- Xác suất phòng sáng giảm từ khoảng 28% xuống 15%; diện tích ô sáng nhỏ hơn và cường độ emissive giảm hơn một nửa.
- Các điểm glow skyline và vệt xe được hạ cường độ để tránh bề mặt thành phố bị lỗ chỗ.
- Một lớp sáng tuyến tính cường độ thấp chạy liên tục theo các đường motorway, trunk, primary, secondary, tertiary và residential, giúp mạng đường trở thành lớp sáng thứ cấp rõ ràng.
- Sân đáp Bitexco được dựng lại thành đĩa loe đường kính khoảng 44 m, đáy 31 m, có trụ thu nhỏ phía dưới, vành ngoài 43,1 m và ký hiệu H lớn hơn. Đây vẫn là hình học minh họa, chưa phải kích thước khảo sát.

## Hiệu năng quan sát

Bản chụp cuối trên máy hiện tại ghi nhận khoảng 76 FPS, 146 draw call và 2.358.028 tam giác ở độ phân giải hiển thị lúc chụp. Đây là một quan sát tức thời, không phải benchmark cho thiết bị khác. Metrics đi cùng PNG là dữ liệu máy đọc được.

## Phân loại trung thực

`illustrative_cinematic_postprocess_not_observed_conditions`

Blue hour, mặt đường ẩm, bloom, vệt đèn và mức phát sáng của cửa sổ là lớp trình diễn thủ tục. Chúng không khẳng định thời tiết, màu vật liệu hay trạng thái chiếu sáng thực tế tại một thời điểm cụ thể.

## Trần của cách làm hiện tại

PoC này đã khai thác gần hết phần có thể tăng bằng shader, instancing, dữ liệu mở và quy tắc thủ tục. Bước nhảy chất lượng kế tiếp cần dữ liệu quan sát: ảnh mặt đứng có ColorChecker, ảnh xiên UAV, DSM/DTM, lidar hoặc mesh photogrammetry được cấp quyền, cùng điểm khống chế và kiểm định sai số.
