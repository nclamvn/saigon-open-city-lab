# Reality.js / realism-effects — đánh giá áp dụng cho HCMC City Lab

Ngày chụp bằng chứng: 2026-09-27 (Asia/Ho_Chi_Minh)

## Kết luận quyết định

**Không đưa `RealityScript/reality.js` vào lõi renderer.** Repository mang đúng tên `reality.js` là một Web Component ra đời năm 2020 để mở mô hình AR qua Apple AR Quick Look và Google Scene Viewer. Nó không cung cấp PBR, global illumination, ambient occlusion, reflection, anti-aliasing, LOD, texture streaming hoặc WebGPU.

**Không cài trực tiếp `realism-effects` vào pipeline hiện tại.** Nhóm hiệu ứng này đúng mục tiêu thị giác (SSGI, SSR, HBAO/SSAO, TRAA, motion blur), nhưng phiên bản công khai 1.1.2 thuộc hệ WebGL + `postprocessing`; City Lab hiện dùng Three.js r186 `WebGPURenderer` + TSL và đã có fallback WebGL 2. Ghép hai pipeline sẽ tăng render pass, bộ nhớ GPU và rủi ro sai depth/velocity/color space.

**Áp dụng ý tưởng, không bê nguyên thư viện:** triển khai các hiệu ứng tương đương bằng `RenderPipeline`/TSL chính thức của Three.js r186: MRT, depth/normal/velocity, GTAO hoặc AO phù hợp, SSR chọn lọc, TRAA/TAA, bloom tiết chế, LUT/grade và sharpen có denoise. Mỗi hiệu ứng phải có quality tier và ngân sách khung hình.

**Giữ AR thành mô-đun phát hành riêng ở phase sau:** nếu cần lãnh đạo đặt một khu quy hoạch lên mặt bàn/sa bàn qua điện thoại, xuất hero tile thành GLB và USDZ rồi dùng `<model-viewer>` hiện hành hoặc liên kết Quick Look/Scene Viewer trực tiếp. AR là kênh trải nghiệm, không phải nâng cấp chất lượng renderer City Lab.

## Bằng chứng định danh

| Ứng viên | Bản chất | Trạng thái chụp | Giấy phép | Mức phù hợp |
|---|---|---|---|---|
| `RealityScript/reality.js` | Web Component điều phối AR Quick Look / Scene Viewer | last push 2020-06-10; 21 stars; không có package.json | MIT | 0/5 cho đồ họa; 2/5 cho AR delivery |
| `arleneio/reality.js` | Fork/copy cùng README và mã | last push 2021-01-23; 0 stars | MIT | 0/5 cho đồ họa |
| `0beqz/realism-effects` | SSGI, SSR, AO, TRAA, motion blur cho Three.js | npm 1.1.2 (2023-05-12); repo last push 2024-02-04 | MIT | 3/5 về kỹ thuật tham khảo; 1/5 cho tích hợp nguyên gói vào WebGPU/TSL |
| `abhayexe/realism-three.js` | Model viewer R3F dùng `realism-effects` 1.1.2 và Three r161 | last push 2025-03-19; 38 stars; repo không khai báo license | chưa khai báo | chỉ tham khảo cấu hình, không sao chép mã |
| `google/model-viewer` | Web component 3D/AR đang duy trì | last push 2026-07-07; hỗ trợ WebXR, Scene Viewer, Quick Look | Apache-2.0 | 4/5 cho AR delivery riêng |

## Tương thích với City Lab hiện tại

City Lab nhập Three.js từ `vendor/three186`, khởi tạo `THREE.WebGPURenderer`, dùng TSL material nodes và fallback WebGL 2. Vì vậy:

1. `RealityScript/reality.js` sẽ chuyển trải nghiệm sang viewer native hoặc `<model-viewer>` 1.0.0 mà nó nạp động; vật liệu TSL, trạng thái camera, lớp ngập, traffic và UI IOC không được giữ nguyên.
2. `realism-effects` phụ thuộc EffectComposer/postprocessing của WebGL và Three r161 trong dự án mẫu. Đây không phải đường nâng cấp an toàn cho r186 WebGPU.
3. Three.js hiện có pipeline hậu kỳ WebGPU chính thức với MRT và composition bằng TSL. Đây là đường đúng kiến trúc để mang các kỹ thuật SSGI/SSR/TRAA/AO vào City Lab.

## Gói nâng cấp đề xuất

### P29A — WebGPU quality pipeline

- `RenderPipeline` thay cho render thẳng khi GPU tier cho phép.
- MRT tối thiểu: output + velocity; depth lấy từ scene pass; normal/roughness chỉ mở ở tier High/Ultra.
- TRAA/TAA cho cạnh nhà, dây cầu, xe và tàu.
- AO/GTAO để neo công trình xuống mặt đất; bán kính theo thang đo thành phố.
- SSR chỉ áp cho sông, kính hero landmark và mặt đường ướt; mask bằng material class.
- Sharpen có denoise sau tone mapping, mức thấp để tránh halo.
- Bộ đo GPU frame time tự hạ tier; mục tiêu 30 fps máy demo, 45–60 fps máy có GPU rời.

### P29B — AR export gateway (tùy chọn)

- Chỉ xuất ROI/hero tile, không xuất toàn thành phố.
- Android/WebXR: GLB đã Draco/Meshopt + KTX2.
- iOS Quick Look: USDZ được bake vật liệu/ánh sáng.
- Manifest nguồn, phiên bản quy hoạch, hệ tọa độ và ngày chụp dữ liệu đi cùng asset.
- QR “Xem trên bàn” mở trang `<model-viewer>` riêng; không nhúng dependency cũ `reality.js` vào City Lab.

## Nguồn chính

- RealityScript/reality.js: https://github.com/RealityScript/reality.js
- arleneio/reality.js: https://github.com/arleneio/reality.js
- realism-effects: https://github.com/0beqz/realism-effects
- realism-three.js: https://github.com/abhayexe/realism-three.js
- Three.js WebGPU post-processing: https://threejs.org/manual/pages/webgpu-postprocessing.html
- Three.js TSL: https://threejs.org/docs/pages/TSL.html
- model-viewer: https://modelviewer.dev/
- Apple AR Quick Look: https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look
- Google model-viewer AR: https://developers.google.com/ar/develop/webxr/model-viewer
