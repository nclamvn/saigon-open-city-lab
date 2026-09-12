# PoC 08 — Màu đô thị và vật liệu ngữ nghĩa

## Kết quả

PoC có thể mô phỏng màu sắc toàn thành phố mà không cần ảnh UAV, nhưng phải tách rõ hai cấp bằng chứng:

- **Có thẻ trực tiếp:** 74/70.719 công trình, tương đương 0,105%.
- **Mô phỏng:** 70.645 công trình còn lại được gán họ màu bằng quy tắc ổn định.

Trong 74 công trình có dữ liệu trực tiếp, registry ghi nhận 53 thẻ `building:colour`, 25 thẻ `roof:colour`, 37 thẻ `building:material` và 11 thẻ `roof:material`. Một công trình có thể mang nhiều thẻ.

[OpenStreetMap](https://wiki.openstreetmap.org/wiki/Key:building:colour) định nghĩa `building:colour` là màu mặt đứng và khuyến nghị kết hợp với `building:material` và `roof:colour`. [building:material](https://wiki.openstreetmap.org/wiki/Key:building:material) mô tả lớp vật liệu ngoài của mặt đứng, phù hợp để chọn họ màu và độ phản xạ trong trình dựng 3D.

## Quy tắc mô phỏng

1. Màu mặt đứng và mái từ OSM được ưu tiên khi tồn tại.
2. Vật liệu kính và nhà cao tầng dùng họ xanh lam–lục, phản xạ môi trường mạnh hơn.
3. Nhà ở dùng các họ kem, đất nung, hồng nhạt và xanh xám.
4. Công trình công cộng dùng đá sáng, vàng nhạt và màu cát.
5. Công trình tôn giáo dùng nhóm màu ấm; công nghiệp dùng xám và nâu oxide.
6. Khu Thủ Thiêm dùng bảng màu đương đại lạnh hơn.
7. Biến thiên trong từng họ màu được tạo xác định từ ID công trình, nên kết quả tái lập được.

## Trải nghiệm

- Góc nhìn `14 · Màu đô thị` trình bày toàn cảnh phân lớp màu.
- Công tắc `Màu đô thị · mô phỏng` cho phép so sánh A/B với bản trung tính.
- Chế độ nguồn chiều cao vẫn hoạt động độc lập và có thể phủ lên màu vật liệu.
- Màu thay đổi nhất quán theo ánh sáng ngày, giờ vàng, chạng vạng, HDRI và ACES tone mapping.

## Giới hạn

Màu mô phỏng không phải màu đo từ ảnh mặt đứng. Ảnh Sentinel trong PoC chỉ dùng cho nền cảnh, không được dùng làm bằng chứng màu mặt đứng. Chưa có ảnh đường phố, ảnh xiên UAV, texture atlas hoặc hiệu chuẩn màu bằng bảng chuẩn. Vì ánh sáng, camera và màn hình đều làm thay đổi cảm nhận màu, ngay cả thẻ màu trực tiếp cũng không phải phép đo quang phổ.

Bước nâng cấp có giá trị nhất là thu ảnh mặt đất có quản lý màu cho một ô mẫu, hiệu chuẩn white balance bằng ColorChecker, phân đoạn mặt đứng rồi tạo texture atlas/PBR. Khi đó PoC có thể chuyển một vùng nhỏ từ “mô phỏng” sang “quan sát được”.
