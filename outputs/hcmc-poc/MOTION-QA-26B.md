# Motion QA 26B

Ngày kiểm tra: 24/09/2026. Phạm vi: giao thông minh họa trong scene WebGPU hiện hành.

## Đường bộ

- 3.200 phương tiện được dựng bằng ba `InstancedMesh`, ưu tiên xe máy theo tỷ lệ sinh 80%, tiếp theo ô tô 18,5% và xe buýt 1,5%.
- Lần chạy xác nhận hiện tại tạo 2.541 xe máy, 606 ô tô và 53 xe buýt; 2.366 phương tiện nằm trong vùng lõi 2,2 km.
- Mỗi phương tiện bám một đoạn tim đường OSM thuộc motorway, trunk, primary, secondary, tertiary hoặc residential.
- Đoạn ứng viên bị loại nếu mẫu giữa làn hoặc hai mép làn rơi vào footprint công trình hay polygon công viên.
- Hai chiều xe dùng offset làn và hướng chuyển động đối nghịch. Cao độ thân xe đặt theo mặt đường hiện hành.
- Ở khoảng cách lớn, matrix cập nhật mỗi hai khung hình để bảo toàn tốc độ render; số draw call không tăng theo số xe.

## Đường thủy

- 22 tàu gồm speedboat, ferry và barge chạy hai chiều, có thân, cabin, kính và wake chữ V bằng các dải tam giác trong suốt.
- Tuyến chuyển động kế thừa dải giữa sông từng dùng ở PoC 06/13.
- Năm offset làn được kiểm tra tại 1.201 lát cắt, tổng cộng 6.005 mẫu. Runtime QA ghi nhận `motionVesselOutside=0`.
- Tuyến là mô phỏng trực quan bám polygon mặt nước, không phải luồng hàng hải chính thức và không dùng AIS thời gian thực.

## Kết quả trình duyệt

- WebGPU khởi tạo sạch, không warning/error.
- Ảnh cách nhau ba giây cho thấy tàu đổi vị trí dọc sông.
- Dataset runtime công bố số xe máy, ô tô, xe buýt, tàu và số mẫu tàu ngoài nước để QA tự động đọc được.
