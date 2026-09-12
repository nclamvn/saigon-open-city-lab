# PoC 09 — Color Calibration & Texture Atlas

## Kết quả

PoC 09 bổ sung một texture atlas thủ tục 1.024 × 512 pixel cho toàn bộ 70.719 công trình trong mô hình. Atlas gồm 8 họ vật liệu: vữa ấm, nhà ở sơn màu, kính curtain-wall, đá công sở, công nghiệp màu oxide, công trình đương đại tông lạnh, công trình tôn giáo tông ấm và bê tông phổ thông.

74 công trình có ít nhất một thẻ màu hoặc vật liệu trực tiếp từ OpenStreetMap; 70.645 công trình còn lại được phân loại bằng quy tắc tất định. Các thẻ `building:colour` và `building:material` tuân theo ngữ nghĩa mô tả trong tài liệu chính thức của OpenStreetMap:

- [OpenStreetMap — building:colour](https://wiki.openstreetmap.org/wiki/Key%3Abuilding%3Acolour)
- [OpenStreetMap — building:material](https://wiki.openstreetmap.org/wiki/Key%3Abuilding%3Amaterial)

## Kiến trúc hiển thị

- CanvasTexture 4 × 2 ô, mỗi ô 256 × 256 pixel, sinh ngay trong trình duyệt.
- Thuộc tính đỉnh `materialClass` gán từng mặt của hình học công trình đã gộp vào một trong 8 họ vật liệu.
- Shader dùng tọa độ mặt đứng cho facade và tọa độ cục bộ XZ cho mái; atlas điều biến base color và tạo tín hiệu nhám gần đúng.
- Bảng Texture Atlas Lab cho phép thử exposure từ −1 đến +1 EV, white balance 3.500–8.000 K và cường độ atlas 0–100%.
- Nút A/B trong bảng đồ họa nâng cao cho phép tắt/mở lớp atlas mà không thay dữ liệu hình học.

## Giới hạn được công bố

Atlas này là `illustrative_procedural_texture_atlas_not_observed_facade_texture`: chưa phải texture lấy từ mặt đứng quan sát. Tại thời điểm PoC 09:

- Ảnh thực địa đã hiệu chuẩn: **0**
- Bảng màu đã đo: **0**
- Sai số ΔE2000: **chưa có / null**

Các thanh hiệu chỉnh hiện là sandbox để kiểm tra phản ứng hình ảnh và giao diện quy trình. Chúng không biến atlas thủ tục thành dữ liệu đo màu.

## Quy trình nâng cấp bằng dữ liệu thật

1. Thu ảnh RAW hoặc ảnh với profile cố định; khóa exposure, ISO, khẩu độ và white balance theo từng chế độ ánh sáng.
2. Chụp bảng màu và grey card trong cùng điều kiện chiếu sáng với mặt đứng.
3. Ước lượng đáp ứng camera, exposure và white balance; lưu tham số cùng nguồn ảnh.
4. Phân đoạn mặt đứng, chỉnh phối cảnh, loại vùng bóng sâu/phản xạ không ổn định và ghép texture theo công trình.
5. Bake atlas quan sát cùng provenance đến từng ô texture và từng footprint.
6. Đo, công bố median và p95 của ΔE2000 trên các ô bảng màu tách biệt với ảnh dùng để hiệu chỉnh.

Một đợt thu nhỏ tại 1–2 block quanh Nguyễn Huệ–Bạch Đằng hoặc Bitexco là đủ để thay một phần atlas thủ tục bằng atlas quan sát đầu tiên và kiểm chứng toàn bộ pipeline.

## Kiểm định

- Atlas manifest: PASS — 8 họ vật liệu, lưới 4 × 2, kích thước 1.024 × 512.
- Phân bổ: PASS — 70.719/70.719 công trình.
- Công bố trạng thái hiệu chuẩn: PASS — 0 ảnh, 0 bảng màu, ΔE2000 null.
- Hợp đồng nâng cấp và nhãn phân loại dữ liệu: PASS.
- JavaScript syntax và bản HTML độc lập: được kiểm tra trong quy trình đóng gói.

Ảnh kiểm thử: `poc-nine-atlas.png`; metrics máy đọc được: `poc-nine-atlas.metrics.json`; manifest: `hcmc-poc/data/texture-atlas-09.json`.
