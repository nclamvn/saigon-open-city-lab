# Sài Gòn Open City Lab — PoC 02

Bản nâng cấp ngày 11/09/2026. Mở `hcmc-poc/index.html` qua máy chủ cục bộ, hoặc `SAIGON-3D.html` tự chứa.

## Đã triển khai

- Chuyến tham quan bốn cảnh: ven sông → Bitexco → Nguyễn Huệ → Landmark 81. Mỗi cảnh 15 giây, chuyển tiếp mềm; kéo chuột để thoát.
- Thanh ánh sáng ban ngày → giờ vàng → chạng vạng. Đèn cửa sổ xuất hiện chủ yếu lúc trời tối. Vật liệu kính có độ nhám riêng.
- Lớp UAV minh họa với tuyến, vị trí, vùng quan sát camera hướng xuống, tiến trình, tạm dừng và camera theo UAV. Cao độ 155 m chỉ so với nền quy ước; không có xác nhận vật cản, địa hình hay điều kiện bay.
- Đọc trực tiếp một cửa sổ raster công khai Google Open Buildings Temporal 2023; lưu GeoTIFF 400 × 400, ba kênh. Không cần tài khoản Cloud hoặc Earth Engine.
- Công tắc A/B chiều cao thử nghiệm cho 723 khối trong vùng 106.698–106.710° E, 10.768–10.782° N. Giữ nguyên bản nguồn. Chế độ nguồn chiều cao trở về hình học gốc để tránh trộn nguồn.

## Phương pháp chiều cao thử nghiệm

Nguồn: [Google Open Buildings Temporal](https://sites.research.google/gr/open-buildings/temporal/), v1, mốc 30/06/2023, chọn CC BY 4.0. GeoTIFF nguồn `31754_2023_06_30/tile_TJmqX_9eRXo.tif`, EPSG:32648. Band thực đọc được: building_fractional_count, building_height, building_presence. Lưu notebook chính thức và manifest truy tìm tile trong thư mục research/snapshots.

Chỉ xử lý khối đang dùng chiều cao ước lượng; loại mô hình landmark minh họa. Tính trung vị pixel nằm trong footprint, presence ≥ 0,5, ít nhất bốn pixel, ít nhất 50% diện tích pixel hợp lệ. Loại pixel cao ≥ 95 m để tránh vùng bão hòa sát giới hạn 100 m. Ngưỡng presence là quy tắc lọc thử nghiệm, không có nghĩa xác suất đúng 50%. Chênh lệch trung vị so với cách ước lượng cũ: −1,1 m; đây là khác biệt giữa hai mô hình, không phải độ chính xác được cải thiện 1,1 m.

Raster được lấy trung bình về khoảng 3–4 m/pixel; độ phân giải hiệu dụng công bố khoảng 4 m. Đường biên, nhà liền kề và lớp ảnh khác năm có thể lệch. Không dùng raster này để thay chiều cao các tháp lớn. Có thể kiểm tra từng dòng ở `hcmc-poc/data/height-pilot.json`; chỉ số `index` phân biệt các khối có cùng ID nguồn.

## Các bước tiếp theo và điều kiện hoàn thành

| Bước | Kết quả cần đạt | Trạng thái |
|---|---|---|
| 1. Trải nghiệm + chiều cao pilot | Camera, ánh sáng, UAV, so sánh nguồn thật | Đã có PoC 02 |
| 2. Mở rộng chiều cao | Đọc raster toàn vùng, đối chiếu sai lệch theo nhóm nhà, duyệt trước khi thay mặc định | Chưa thực hiện |
| 3. Kiến trúc trung tâm | Mặt đứng, đế, mái, lan can của các landmark từ ảnh tham chiếu có quyền sử dụng; kiểm tỷ lệ | Chưa thực hiện |
| 4. Vật liệu + ánh sáng | Thử HDRI/PBR CC0, bóng tiếp xúc, nước phản xạ cảnh; so sánh ảnh và tốc độ | Chưa thực hiện |
| 5. Cận cảnh từ ảnh thật | Một cụm photogrammetry hoặc Gaussian Splatting có ảnh đủ góc và quyền sử dụng | Cần bộ ảnh phù hợp; chưa có |
| 6. Mở rộng vận hành | Chia tile/LOD, đo sai số bằng điểm độc lập, cập nhật theo phiên bản | Chưa thực hiện |

[Poly Haven](https://polyhaven.com/license) cung cấp asset CC0, có thể dùng làm vật liệu/ánh sáng tổng quát; hiện mới xác minh nguồn, chưa tích hợp asset. HDRI nơi khác không được trình bày như bầu trời chụp tại TP.HCM.

## Giới hạn hiện tại

Đây vẫn là đô thị dựng hình học với mặt đứng tổng hợp. Chưa đạt photorealism cận cảnh, chưa có địa hình đo đạc hoặc dữ liệu tránh vật cản. Toàn bộ khả năng trong lộ trình chưa hoàn thành; PoC 02 là mốc có thể kiểm tra và tiếp tục phát triển.
