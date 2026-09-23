# Batch 25C — IOC 3D mưa, gió, triều và cảnh báo ngập

Ngày: 2026-09-23

## Trải nghiệm điều hành

- Hai trục điều khiển luôn có giới hạn: mưa 0–200 mm và triều tham chiếu 1,40–1,80 m.
- Mưa được thể hiện bằng tối đa 1.580 streak canvas; góc rơi và ba dải gió biến thiên theo gust. Dừng mưa giữ màn sương và lớp nước để zoom/kiểm tra.
- Ba KPI cập nhật cùng lúc: cấp cảnh báo, độ sâu proxy và vận tốc gió hiệu ứng.
- Nút **Kịch bản xấu nhất** đặt 200 mm + 1,80 m, chuyển camera sang overview hiện hành, bật cảnh báo đỏ và beacon 3D tại các tuyến có tên trong snapshot đường.
- Beacon lấy tâm từ các đoạn đường OSM hiện có, không đặt ngẫu nhiên. Các tuyến có dữ liệu trong scene gồm Quốc Hương, Thảo Điền, Nguyễn Văn Hưởng, Tống Hữu Định, Xuân Thủy, Nguyễn Hữu Cảnh, Điện Biên Phủ và Mai Chí Thọ.
- Thanh đỏ ghi rõ `STRESS TEST · KHÔNG PHẢI DỰ BÁO`; URL có thể tái lập trạng thái bằng `?v=25c&view=overview&scenario=stress-test`.

## Hàm trực quan

Chỉ số mức độ trực quan:

`severity = 0.64 × rainRatio + 0.36 × tideRatio`

`rainRatio = rain / 200`; `tideRatio = (tide - 1.40) / 0.40`.

Độ sâu proxy hiển thị từ 0 đến 0,50 m, neo trần vào giá trị quan trắc công khai 30–50 cm tại Quốc Hương trong một sự kiện mưa–triều. Hàm này chỉ điều khiển hình ảnh và kể chuyện; không phải quan hệ mưa–triều–độ sâu đã hiệu chỉnh.

Cảnh báo thị giác: theo dõi `<0,30`; vàng `0,30–0,55`; cam `0,55–0,78`; đỏ `≥0,78`. Đây không phải ma trận cảnh báo vận hành của thành phố.

## Giới hạn nguồn

Các mốc 1,60 / 1,70 / 1,80 m được bài viết Sở KH&CN TP.HCM mô tả là đề xuất của nhóm nghiên cứu. UI dùng chúng như mốc tham chiếu có dấu `*`, không gọi là ngưỡng đã phê duyệt. Phạm vi overview hiện chỉ là scene 38,57 km²; toàn TP.HCM vẫn là đích mở rộng dữ liệu.

## Kiểm định

- Flood QA: 7/7.
- Renderer QA: 14/14.
- Hygiene QA: 4/4.
- Headless Chrome/WebGL 2 biên dịch được cảnh overview; không có CITY24_ERROR, FLOOD25_ERROR hay JavaScript exception.
