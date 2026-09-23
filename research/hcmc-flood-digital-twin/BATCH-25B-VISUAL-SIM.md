# Batch 25B — mô phỏng thị giác mưa và ngập Thảo Điền

Ngày: 2026-09-23

## Hành vi đã triển khai

- Mở Flood Lab hoặc URL `?v=25b&view=flood25` đưa camera đến hành lang Thảo Điền, không còn quay về Bạch Đằng/toàn vùng.
- Thanh mưa tích lũy bị giới hạn 0–200 mm. Trần 200 mm bám sự kiện lịch sử được báo cáo là “gần 200 mm”; đây không phải giá trị IDF thiết kế.
- Nút Chạy mưa tăng tích lũy trong 25 giây. Nút Dừng mưa dừng hạt mưa nhưng giữ màn sương và nước để tiếp tục zoom/xoay.
- Cường độ hiệu ứng tăng theo lượng tích lũy: mưa thưa → mưa lớn → màn mưa trắng ở gần trần.
- Lớp nước bám đúng các đoạn tim đường OSM có tên Quốc Hương, Thảo Điền và Nguyễn Văn Hưởng trong snapshot hiện hành.
- Nút Zoom tuyến ngập đưa camera trở lại preset kiểm tra cận cảnh.

## Kỷ luật sự thật

Lớp nước là `bounded_visual_proxy`, không phải kết quả SWMM/HEC-RAS. Nó chỉ dùng để diễn giải tương tác và thiết kế trải nghiệm. Độ sâu quan trắc hiển thị trong panel vẫn thuộc từng sự kiện nguồn; không dùng thanh mưa để suy ra tuyến tính thành dự báo độ sâu.

Không mở nút “Chạy mô phỏng 1D/2D” cho đến khi có hyetograph, hydrograph triều, vertical datum, DTM và mạng thoát nước. Việc tách hai lớp giúp demo có trải nghiệm trực quan ngay nhưng không biến hiệu ứng đồ họa thành tuyên bố kỹ thuật.

## Hiệu năng

Mưa dùng một canvas 2D phủ màn hình, tối đa 1.580 streak mỗi frame, tách khỏi draw call Three.js. Cập nhật DOM và mesh nước được giới hạn khoảng 12,5 lần/giây khi autoplay. Ba hành lang nước là ba mesh, không tạo mesh theo từng giọt hoặc từng ô lưới.

## Kiểm chứng

- Flood QA: 6/6.
- Renderer QA: 13/13.
- Hygiene QA: 4/4.
- Headless Chrome/WebGL 2: cảnh biên dịch, camera ở Thảo Điền, panel 25B và điều khiển mưa hiện diện; không có CITY24_ERROR, FLOOD25_ERROR hoặc JavaScript exception.
