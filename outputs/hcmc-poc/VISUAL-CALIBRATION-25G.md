# Visual Calibration 25G

City Lab dùng một hệ màu trên cao duy nhất làm mặc định. Không còn chế độ cinema, hồ sơ A/B, trạng thái `localStorage` hay tham số URL `grade`.

## Căn cứ thị giác

Đợt rà soát dùng 12 ảnh trên cao TP.HCM có giấy phép mở từ Wikimedia Commons, bài hướng dẫn/chùm ảnh flycam của Tuổi Trẻ và tài liệu Sentinel-2 của Copernicus. Phân tích 882.532 điểm ảnh hợp lệ ghi nhận 38,06% điểm ảnh có sắc độ rõ (`S ≥ 0,16`) và 15,79% có sắc độ cao (`S ≥ 0,32`). Trong nhóm có sắc độ, cyan và blue chiếm 59,48%; phần còn lại phân bố ở đỏ–cam–vàng và xanh lá. Ảnh trời trong ở khoảng cách gần đạt 48,89–72,70% điểm ảnh có sắc độ, trong khi ảnh toàn cảnh nhiều sương chỉ còn 0,42–12%.

Kết quả này không chứng minh mọi góc nhìn TP.HCM đều sặc sỡ. Nó dẫn đến quy tắc render: cận và trung cảnh giàu màu; lớp xa giảm bão hòa và tương phản để giữ chiều sâu khí quyển.

## Cấu hình mặc định

- Tường có 48 màu theo tám họ vật liệu; mái có 40 biến thể đỏ oxit, terracotta, tôn xanh, cyan và xám ấm.
- Shader tăng bão hòa từ 1,06 ở xa đến 1,18 ở gần; tương phản từ 1,045 đến 1,10 trước ACES tone mapping.
- Cây dùng biến thiên hue/saturation có hạt giống ổn định; công viên, mặt đường, vỉa hè, vạch đường và nước có dải màu tách lớp rõ hơn.
- Ba trạng thái Ngày, Giờ vàng và Đêm vẫn là ánh sáng môi trường cần thiết, không phải chế độ color grade. Mỗi trạng thái có nền trời, sương, mặt trời, hemisphere light và exposure riêng.
- WebGPU render tối đa 1,6 DPR; WebGL fallback giữ trần 1,35 DPR.

Registry nguồn, ảnh mẫu, phép đo, claim ledger và bite test nằm tại `research/hcmc-visual-spectrum-26/` ở thư mục gốc dự án.

Hiệu chỉnh chỉ thay cách hiển thị. Nó không thay footprint, chiều cao, phân loại công trình, hình học cầu, lớp ngập hay trạng thái bằng chứng. Màu suy luận vẫn phải được hiểu theo giới hạn công bố của Material Engine.
