# Visual Calibration 25G

City Lab dùng một hệ màu trên cao duy nhất làm mặc định. Không còn chế độ cinema, hồ sơ A/B, trạng thái `localStorage` hay tham số URL `grade`.

## Căn cứ thị giác

Đợt rà soát dùng 12 ảnh trên cao TP.HCM có giấy phép mở từ Wikimedia Commons, bài hướng dẫn/chùm ảnh flycam của Tuổi Trẻ và tài liệu Sentinel-2 của Copernicus. Phân tích 882.532 điểm ảnh hợp lệ ghi nhận 38,06% điểm ảnh có sắc độ rõ (`S ≥ 0,16`) và 15,79% có sắc độ cao (`S ≥ 0,32`). Trong nhóm có sắc độ, cyan và blue chiếm 59,48%; phần còn lại phân bố ở đỏ–cam–vàng và xanh lá. Ảnh trời trong ở khoảng cách gần đạt 48,89–72,70% điểm ảnh có sắc độ, trong khi ảnh toàn cảnh nhiều sương chỉ còn 0,42–12%.

Kết quả này không chứng minh mọi góc nhìn TP.HCM đều sặc sỡ. Nó dẫn đến quy tắc render: cận và trung cảnh giàu màu; lớp xa giảm bão hòa và tương phản để giữ chiều sâu khí quyển.

## Cấu hình mặc định

- Tường có 48 màu theo tám họ vật liệu; mái có 40 biến thể đỏ oxit, terracotta, tôn xanh, cyan và xám ấm. Công trình kính, công trình trung tâm và khối cao từ 45 m dùng dải xám xanh trung tính pha 22% soft light blue, giới hạn saturation ở 22% để phản chiếu trời rõ hơn mà không thành các khối cyan.
- Shader tăng bão hòa từ 1,06 ở xa đến 1,18 ở gần; tương phản từ 1,045 đến 1,10 trước ACES tone mapping.
- Cây dùng biến thiên hue/saturation có hạt giống ổn định; công viên, mặt đường, vỉa hè, vạch đường và nước có dải màu tách lớp rõ hơn.
- Ba trạng thái Ngày, Giờ vàng và Đêm vẫn là ánh sáng môi trường cần thiết, không phải chế độ color grade. Mỗi trạng thái có nền trời, sương, mặt trời, hemisphere light và exposure riêng.
- WebGPU render tối đa 1,6 DPR; WebGL fallback giữ trần 1,35 DPR.

## Visual 26A–26E

Đợt nâng cấp 26 giữ nguyên dữ liệu và giao diện nhưng thay toàn bộ cách scene mặc định tổ chức màu, sáng và chiều sâu:

- Sương chuyển sang mật độ giới hạn theo khoảng cách, dùng nền trời gradient xám xanh–xám ấm; lớp phủ CSS bỏ chế độ hòa trộn `multiply` để xóa dải ngang và ám cyan ở đường chân trời.
- Tường thấp tầng giảm saturation và độ ngẫu nhiên; mái vẫn giữ nhóm đỏ oxit, terracotta, tôn xanh và vàng nhạt. Shader chỉ tăng saturation 1,015–1,085 nhưng tăng contrast 1,06–1,13 để màu rõ mà không bị phát quang.
- Mặt đứng có điều biến theo hướng mặt, độ cao và tiếp xúc nền. Hemisphere light giảm, mặt trời ấm hơn và shadow map tăng lên 4.096 px để khối công trình có cạnh sáng–tối rõ hơn.
- Kính, tường xây và cửa sổ dùng roughness/metalness riêng. Cao ốc giữ dải blue-gray tối vừa phải thay cho cyan hoặc trắng xám.
- Nước dùng ba tần số sóng, màu xanh sâu và roughness động; nền vệ tinh, công viên và tán cây hạ bão hòa để không tranh màu với mái đô thị.

Visual 26 là cấu hình mặc định duy nhất, không bổ sung một chế độ cinema hoặc tham số URL mới.

Registry nguồn, ảnh mẫu, phép đo, claim ledger và bite test nằm tại `research/hcmc-visual-spectrum-26/` ở thư mục gốc dự án.

Hiệu chỉnh chỉ thay cách hiển thị. Nó không thay footprint, chiều cao, phân loại công trình, hình học cầu, lớp ngập hay trạng thái bằng chứng. Màu suy luận vẫn phải được hiểu theo giới hạn công bố của Material Engine.
