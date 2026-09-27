# City Visual Runtime 28B

## Mục tiêu

28B chuyển trọng tâm từ chỉnh màu toàn cảnh sang **độ sâu hình học có phân cấp theo camera**. Footprint và chiều cao nguồn vẫn là lớp dữ liệu nền; parapet, gờ mặt đứng, mái che, bồn kỹ thuật và đèn đường mới là hình học trình diễn được suy luận, không phải hiện trạng khảo sát.

## Kỹ thuật được chuyển hóa độc lập

- LOD `hero / district / city` bật chi tiết theo cự ly camera.
- Instancing cho chi tiết lặp lại, giữ draw-call thấp.
- Mặt đứng gần có gờ thật; mái có parapet và thiết bị để phá silhouette khối hộp.
- Semantic facade kits đổi tỷ lệ ô cửa theo cao ốc kính, nhà ở và công trình công cộng; tower fin và spandrel phá nhịp lưới đồng dạng.
- Hero district có cornice khối đế, mái che và lightbox tầng trệt bằng instancing.
- Trục đường chính có đèn đường theo khoảng cách thực, neo trên OSM centerline.
- Wake tàu gồm ba cặp Kelvin V riêng, fade ở đầu–đuôi–mép; không còn mặt phẳng prop-wash hình chữ nhật hoặc additive blending gây vệt trắng ngang.
- Pipeline hậu kỳ đọc depth buffer để tạo micro-contact có giới hạn và phục hồi chi tiết bị haze làm mềm.
- WebGPU là đường chính; WebGL 2 vẫn là fallback bắt buộc.

Đây là triển khai clean-room dựa trên nguyên lý đồ họa phổ quát. Không dùng mã nguồn, shader, texture, model hoặc animation của SpiderBench.

## Phân loại dữ liệu

| Lớp | Trạng thái |
|---|---|
| Footprint, road centerline | Dữ liệu nền của dự án |
| Chiều cao | Hỗn hợp nguồn trực tiếp và ước lượng như manifest hiện hành |
| Parapet, ledge, awning, rooftop plant, street lamp | Inferred presentation geometry |
| Depth micro-contact | Hiệu ứng hiển thị, không phải dữ liệu đo |

## Giới hạn

28B chưa thay mặt đứng bằng ảnh đúng từng công trình và chưa phải photogrammetry/3DGS. Chi tiết suy luận chỉ giải quyết nhịp, tỷ lệ và độ sâu thị giác. Các hero district cần tiếp tục được thay dần bằng asset đã kiểm chứng nguồn.
