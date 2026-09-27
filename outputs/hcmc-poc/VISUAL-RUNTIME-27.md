# City Visual Runtime 27

## Mục tiêu

Nâng chất lượng cảm nhận của bản đồ TP.HCM bằng một runtime hình ảnh thống nhất, trong khi vẫn giữ dữ liệu không gian và provenance làm nguồn sự thật. Thiết kế tham khảo các nguyên tắc phổ biến của game thành phố hiện đại: chi tiết theo khoảng cách, vật liệu có biến thiên, môi trường chuyển động, camera có khối lượng và ngân sách GPU tự điều chỉnh.

## Biên giới giấy phép

SpiderBench chỉ được dùng làm chuẩn quan sát về chất lượng và cấu trúc vấn đề. Bản 27A không nhập mã nguồn, shader, model, texture, quảng cáo, nhân vật hoặc animation từ repo đó. Mọi thay đổi trong City Lab được viết độc lập trên Three.js r186 và dữ liệu hiện có của dự án.

## Các lớp runtime

1. **HDR presentation pipeline** — render pass WebGPU/TSL, highlight spread chín mẫu có giới hạn, tách màu vùng sáng/tối, vignette nhẹ và grain chống banding trước ACES output.
2. **Semantic facade** — khung cửa, mullion, chiều sâu nội thất, ban công theo lớp nhà ở, vệt phong hóa và clearcoat theo vật liệu. Cường độ chi tiết giảm dần theo khoảng cách để tránh aliasing.
3. **Urban surface** — aggregate và wear trên mặt đường; nước có current band, fine ripple, Fresnel và roughness thay đổi theo trường sóng.
4. **Living city** — 3.200 phương tiện bám centerline OSM, 22 tàu theo hành lang sông đã kiểm tra nằm trong thủy hệ; wake gồm ba lớp Kelvin V và prop wash động.
5. **Vegetation HLOD** — cận cảnh dùng tán ba lobe bất đối xứng; toàn cảnh dùng khối icosahedron nhẹ. Chuyển mức dựa trên camera scale.
6. **Executive camera** — chuyển preset bằng critical damping, orbit/pan/zoom có quán tính, bóng co theo vùng quan sát.
7. **Adaptive quality** — pixel ratio điều chỉnh chậm theo FPS, có cooldown để tránh dao động và không thay đổi khi người xem đang thao tác.

## Điều kiện đúng

- Hình học công trình vẫn đến từ `CITY_DATA` và các correction có provenance.
- Màu không có thẻ nguồn được xem là suy luận vật liệu ổn định, không phải màu khảo sát.
- Giao thông và tàu thuyền là chuyển động minh họa, không phải dữ liệu live traffic/AIS.
- Lớp ngập vẫn là bounded visual proxy; hydraulic solver tiếp tục fail-closed.
- HDRI Venice Sunset là ngữ cảnh chiếu sáng CC0, không được mô tả như ảnh chụp TP.HCM.

## Cổng kiểm định

```bash
for file in scripts/qa-*.cjs; do node "$file"; done
```

Trình duyệt phải tải xong, không có lỗi hoặc cảnh báo console, chuyển được giữa toàn cảnh, ven sông, Nguyễn Huệ, Ba Son; ba trạng thái ngày, giờ vàng và đêm phải hoạt động; chế độ WebGL2 fallback vẫn khởi tạo được.
