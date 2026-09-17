# TIP — Batch 20A · Photoreal Hero Zone

## Mục tiêu

Dựng một cảnh lãnh đạo có thể nhận ra ngay khu Nhà hát Thành phố trên nền dữ liệu hiện có. Ưu tiên chiều sâu kiến trúc, vật liệu, không gian công cộng và nhịp camera trước khi mở rộng diện tích.

## Phạm vi thực hiện

- Hero zone: Nhà hát Thành phố và tiền cảnh đô thị lân cận.
- Hình học nổi: mái, khối giữa, vòm, cột, cửa, phào, bậc, lan can và chi tiết sân trước.
- Lớp nhận dạng: ảnh đúng địa điểm của Nhà hát, chỉ dùng trên vùng trung tâm có hình học đỡ.
- Ba trạng thái ánh sáng: ban ngày, giờ vàng và chạng vạng.
- Tích hợp cảnh hero vào hành trình trình diễn lãnh đạo.
- LOD cự ly gần để chi tiết nhỏ không làm nặng toàn cảnh.

## Phân loại bằng chứng

| Thành phần | Phân loại | Cách dùng |
|---|---|---|
| Footprint và trục mặt đứng | Dữ liệu mở đã lưu trong dự án | Neo vị trí và hướng |
| Ảnh Nhà hát | Ảnh đúng địa điểm, CC BY-SA 4.0 | Nhận dạng bề mặt trung tâm |
| Chiều cao 26 m | Giá trị trong manifest mặt đứng, chưa đo kiểm | Giới hạn bao hình |
| Vòm, cột, mái, cửa, phào | Photo-derived approximation | Hình học suy diễn từ ảnh tham chiếu |
| Sân, đèn, ghế, người và cây bổ sung | Illustrative public-realm proxy | Tăng cảm nhận tỷ lệ, không tuyên bố hiện trạng |
| Ánh sáng | Illustrative cinematic condition | Trình diễn thị giác, không phải ảnh chụp đồng thời |

## Tiêu chí nghiệm thu

1. Nhận ra Nhà hát từ góc hero mà không cần đọc nhãn.
2. Không còn một tấm ảnh phẳng phủ toàn khối nhà trong hero view.
3. Hình học nguồn ảnh và hình học suy diễn có phân loại máy đọc được.
4. Chi tiết nhỏ tự tắt khi camera rời hero view hoặc ở xa.
5. Ba trạng thái ánh sáng hoạt động trong cùng góc nhìn.
6. Cảnh hero xuất hiện trong trailer lãnh đạo, không làm sai lớp quy hoạch.
7. Không có lỗi console mới; mục tiêu tương tác 45–60 FPS trên máy demo.

## Ngoài phạm vi Batch 20A

- Hình học khảo sát LoD3.
- Cao độ tuyệt đối, nội thất và dữ liệu vận hành thời gian thực.
- Công trình tương lai khi chưa có hồ sơ quy hoạch chính thức đã kiểm chứng.
- Ảnh mặt đứng độ phân giải cao mới hoặc reality mesh UAV.
