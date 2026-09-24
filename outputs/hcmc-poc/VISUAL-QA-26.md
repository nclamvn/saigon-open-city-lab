# Visual QA 26

Ngày kiểm tra: 24/09/2026. Phạm vi: scene mặc định WebGPU Material Engine, không thay dữ liệu hình học hay UI.

## Tiêu chí nghiệm thu

- Toàn cảnh không có đường chia ngang hoặc lớp cyan phẳng giữa trời và thành phố.
- Nhà thấp tầng giữ màu mái đa dạng nhưng tường không trở thành các khối màu kẹo.
- Cao ốc có dải xám xanh, mặt sáng–tối khác nhau và ô kính không tạo lỗ đen.
- Đường, công viên, tán cây, nền ảnh vệ tinh và nước đọc được thành các lớp riêng.
- Nước có biến thiên đa tần số nhẹ; không tạo sóng lớn giả địa hình thủy lực.
- Ngày, Giờ vàng và Đêm dùng cùng hệ vật liệu. Giờ vàng chỉ đổi nguồn sáng và khí quyển, không dùng hậu kỳ riêng.
- Các hiệu chỉnh vẫn phải đạt WebGPU và WebGL 2 fallback, không có warning/error runtime.

## Kết quả kiểm tra trình duyệt

- Backend thật: WebGPU / TSL.
- Góc kiểm: `overview`, `materials`, `boulevard`; ánh sáng Ngày và Giờ vàng.
- Không có lỗi hoặc cảnh báo console.
- FPS quan sát trong phiên QA: 90–120 FPS ở viewport 863×996 sau khi tăng shadow map lên 4.096 px; đây là số tại máy kiểm tra, không phải cam kết phần cứng mục tiêu.
- Scene giữ 132 mesh và khoảng 5,9 triệu tam giác theo HUD hiện hành.

## Giới hạn

Đây là nâng cấp vật liệu procedural trên footprint và chiều cao hiện có. Nó không biến công trình proxy thành photogrammetry, không bổ sung mặt đứng khảo sát và không thay dữ liệu ảnh nền độ phân giải thấp ở một số vùng.
