# Visual Calibration 25G

City Lab có hai hồ sơ màu dùng chung một hình học và cùng nguồn dữ liệu:

- **Trình diễn** là mặc định: tăng bão hòa vật liệu 10%, tương phản vi mô 7,5%, giảm mật độ sương 28–34% tùy cảnh và tăng render scale WebGPU từ 1,5 lên tối đa 1,6 DPR.
- **Tham chiếu** giữ bảng màu, sương, exposure và render scale trước đợt hiệu chỉnh để đối chiếu A/B.

Ba trạng thái Ngày, Giờ vàng và Đêm có nền trời, sương, cường độ mặt trời, hemisphere light và exposure riêng. Mặt nước, công viên, cây, mặt đường và vạch đường đổi theo cùng hồ sơ; shader thành phố thực hiện color grading trước tone mapping ACES.

Hồ sơ được lưu trong `localStorage`, đồng bộ giữa hai bộ nút và ghi vào URL bằng `grade=reference|presentation`. Tham số URL có quyền ưu tiên khi mở liên kết trình diễn.

Hiệu chỉnh chỉ thay cách hiển thị. Nó không thay footprint, chiều cao, phân loại công trình, hình học cầu, lớp ngập hay trạng thái bằng chứng. Màu suy luận vẫn phải được hiểu theo giới hạn công bố của Material Engine.
