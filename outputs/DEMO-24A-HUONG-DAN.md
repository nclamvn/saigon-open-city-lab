# Hướng dẫn demo PoC 24A — WebGPU Material Engine

1. Chạy `python3 outputs/hcmc-poc/serve.py` tại thư mục dự án.
2. Mở `http://127.0.0.1:8768/hcmc-poc/webgpu-materials-24.html?v=24e&view=bason` để bắt đầu tại cụm cầu Ba Son + Marina Central + bốn tháp Grand Marina.
3. Giữ **Giữ để xem khối nền** để so sánh A/B trên đúng góc camera.
4. Chuyển lần lượt **Ngày → Giờ vàng → Đêm** để trình bày độ nhám, kính và occupancy.
5. Chọn **Nguyễn Huệ**, sau đó **Toàn vùng** để chứng minh cùng một hệ vật liệu làm việc ở hai cự ly.
6. Kéo **Độ thực hóa** nếu cần giải thích ranh giới giữa geometry nền và lớp vật liệu suy luận.

HUD phải báo `WEBGPU / TSL`. Nếu máy không hỗ trợ WebGPU, renderer tự dùng WebGL 2 và HUD ghi `WEBGL 2 / TSL FALLBACK`. Có thể ép đường fallback bằng `&backend=webgl` để thử trước buổi demo.

Thông điệp trình bày: đây là hệ thống vật liệu theo dữ liệu và LOD phủ toàn vùng hiện hành. Màu có nguồn được ưu tiên; mặt đứng còn lại là mô phỏng có kiểm soát, chưa thay thế ảnh xiên/LiDAR/photogrammetry.
