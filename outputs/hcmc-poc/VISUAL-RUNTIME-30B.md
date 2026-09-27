# Visual Runtime 30B — Render Foundation + Hero Corridor

## Phạm vi đã triển khai

- Three.js r186 WebGPU/TSL làm backend chính, WebGL 2 là fallback.
- Quality tier qua `?quality=presentation|balanced|performance`.
- `presentation`: GTAO 8 mẫu ở 55% độ phân giải, TRAA dùng velocity/depth, emissive bloom có chọn lọc, grade, sharpen và CSM ba cascade.
- `balanced`: GTAO 6 mẫu, TRAA, bloom và CSM hai cascade.
- `performance`: depth micro-contact, local contrast, grade, sharpen và một shadow frustum thích nghi.
- Adaptive render scale có biên theo tier; camera đang tương tác không tự tăng độ phân giải.
- Hero Corridor `view=corridor` đưa ba vỏ ảnh–hình học có nguồn vào renderer đang hoạt động: Nhà hát Thành phố, Hotel Continental, Caravelle Saigon.
- Atlas nhận dạng cũ được tách thành manifest 38 KB cho runtime WebGPU: 11 mặt ảnh đã qua cổng phẳng bổ sung cho trục trung tâm; 3 mặt khác do Hero Corridor chuyên dụng xử lý. Năm mặt cần tách bề mặt và một vỏ lấy mẫu không bị tự động thăng hạng.
- Sáu centerline OSM của Lam Sơn–Đồng Khởi làm neo cho mặt đường, curb, tim đường và đèn phố minh họa.
- Mặt đường và vỉa hè của corridor dùng 2 bộ PBR 1K CC0 từ Poly Haven, đủ diffuse/normal OpenGL/roughness/AO. UV lặp theo kích thước vật lý công bố 30 m và 1,8 m, không kéo một ảnh phủ cả tuyến.
- Biên nhận `assets/pbr30/SOURCES.json` lưu trang nguồn, tác giả, giấy phép CC0, URL từng map, MD5 nguồn và SHA-256 file cục bộ.

## Phân loại bằng chứng

| Lớp | Trạng thái |
|---|---|
| Vị trí/footprint ba công trình | Neo vào bản ghi open-map đã lưu |
| Ảnh nhận dạng | Ảnh đúng địa điểm, có URL/tác giả/giấy phép trong runtime |
| Chiều cao Caravelle | 24 tầng × 3,2 m là quy tắc hiển thị, chưa khảo sát |
| Chiều sâu, phào, cột, cửa và khối mái | Photo-derived approximation |
| Bề rộng đường, đèn, curb, vạch qua đường | Illustrative public-realm proxy |
| Vật liệu asphalt/vỉa hè | PBR CC0 có biên nhận; không phải mẫu vật liệu đo tại TP.HCM |
| Toàn bộ 70.726 công trình ngoài corridor | LOD vĩ mô, phần lớn vật liệu/chiều cao suy luận |

## Lỗi đã chặn trong QA

CSM từng làm toàn cảnh đen vì runtime gán `csm.camera` trước bước setup. Trong Three.js r186, việc đó khiến `_init()` không chạy và cascade chưa được cấp phát. Bản 30B để camera ở trạng thái null để `CSMShadowNode` tự khởi tạo từ node builder. QA trực quan đã xác nhận cả `performance` và `presentation` hiển thị cảnh; tier trình diễn hoạt động sau warm-up.

## Giới hạn còn lại của Batch 30

Runtime 30B hoàn thành nền render, lát cắt hero đầu tiên và atlas PBR thật cho public realm của corridor. Các bước còn lại của chiến lược là kit hình học mặt phố rộng hơn, SSR có mask, volumetric haze tiết chế, geometry riêng cho 20–30 công trình hero và benchmark GPU time theo pass. Không gắn nhãn các bước này là đã hoàn thành.

## Mở và kiểm tra

```text
http://127.0.0.1:8768/hcmc-poc/webgpu-materials-24.html?v=30b&view=corridor
http://127.0.0.1:8768/hcmc-poc/webgpu-materials-24.html?v=30b&view=overview&quality=performance
```

```sh
node scripts/qa-visual-runtime-30b.cjs
node scripts/qa-webgpu-materials-24.cjs
node scripts/qa-project-hygiene.cjs
```
