# Vì sao SpiderBench nhìn tốt hơn HCMC City Lab

Ngày audit: 2026-09-27. Nguồn SpiderBench được đọc trực tiếp từ `xikhar/spiderbench` nhánh `main`; City Lab đọc từ runtime 28B trong workspace.

## Kết luận

Khoảng cách không đến từ Three.js hay WebGPU. SpiderBench vượt trội vì bốn tầng — asset, hình học, ánh sáng/hậu kỳ và camera — đều được phát triển như một game có art direction thống nhất. City Lab đang ưu tiên độ phủ địa lý, provenance và toàn cảnh thành phố; phần lớn nội dung nhìn thấy vẫn là massing suy luận.

## Chứng cứ định lượng

| Hạng mục | SpiderBench | HCMC City Lab 28B | Hệ quả thị giác |
|---|---:|---:|---|
| Mã JS | 124 file, 50.474 dòng | lõi active chính khoảng 1.253 dòng (`webgpu-materials`, visual runtime, detail runtime) | SpiderBench có nhiều hệ thống chuyên biệt hơn |
| Mã dựng thế giới | 50 module, 30.596 dòng | phần detail runtime 182 dòng, phần lớn thế giới trong một file 921 dòng | Ta mới thêm chi tiết theo quy tắc chung, chưa dựng không gian theo khu phố |
| Mã renderer | 13 module, 3.812 dòng | visual post runtime 150 dòng | Ta thiếu nhiều pass vật lý và lịch sử khung hình |
| Asset thị giác | ~138 MB texture/model/audio; 26 PNG + 26 WebP + 4 GLB | 415 MB toàn thư mục nhưng chủ yếu geodata/tile/phiên bản; ít atlas PBR dùng đồng bộ trong active renderer | Dung lượng lớn không đồng nghĩa bề mặt giàu |
| Phạm vi | đảo game được tác giả kiểm soát, được phép hư cấu | 38,57 km² TP.HCM, 70.726 khối | Mật độ công sức trên mỗi km² của ta thấp hơn rất nhiều |
| Độ tin cậy hình học | mọi khối được tạo để đẹp trong game | 69.937/70.726 chiều cao ước lượng; nền phẳng | silhouette và tỷ lệ công trình chưa đủ thật |
| Vật liệu quan sát trực tiếp | atlas albedo/normal/AO/roughness/interior chuyên dụng | chỉ 74/70.719 công trình có tag màu/vật liệu trực tiếp; phần còn lại suy luận | màu hợp lý nhưng không mang danh tính công trình |

## Bốn nguyên nhân chính

### 1. Họ có dữ liệu thị giác giàu hơn trên mỗi pixel

SpiderBench có atlas riêng cho asphalt color/normal/macro, sidewalk color/normal, wall color/normal/height-AO, interior, roof color/normal, road marking, water normal, leaves, signage và decal. Một khung hình vì thế chứa biến thiên ở nhiều tần số: hình khối lớn, nhịp mặt đứng, khe/rãnh, độ nhám và vết bẩn.

City Lab hiện sinh ô cửa, gờ, parapet và màu bằng shader/quy tắc. Đó là cải thiện tốt cho LOD xa, nhưng một ô cửa procedural không chứa rèm, nội thất, khung, phản xạ và sai lệch vật liệu như ảnh/PBR thật.

### 2. Họ đầu tư hình học trung/cận cảnh, không chỉ massing

Riêng các module `buildings`, `rooftops`, `Times Square`, `props`, `ground`, `park`, `facade`, `Grand Central`, `waterfront`, traffic và crowd đã hàng nghìn dòng mỗi khu. Mái có thiết bị, sân sau, hàng rào, cửa hàng, biển hiệu, curb, marking mòn, bollard, lamp, cây nhiều LOD và pedestrian.

City Lab đang có đúng footprint và một số landmark/correction, nhưng phần lớn công trình vẫn là extrusion. Shader không thể tạo silhouette mái, setback, ban công, podium, cửa hàng tầng trệt hoặc chiều sâu nội thất nếu geometry không có.

### 3. Renderer của họ là pipeline điện ảnh đầy đủ

Preset High của SpiderBench dùng 5 cascade shadow tới 3 km, N8AO full-resolution, TAA, SSGI, SSR, volumetric sun shafts, DoF 43 taps, motion blur, bloom 6 tầng, auto exposure, sharpen, color grade, vignette và dither. Họ còn có GPU profiler, warm-up và quality tiers.

City Lab 28B dùng một directional shadow, HDR environment, ACES, một spread highlight 9 mẫu, local contrast, depth-edge darkening, grade, vignette và grain. Đây là presentation pass tốt nhưng chưa phải AO/GI/reflection/temporal pipeline thật.

### 4. Họ đạo diễn camera cho độ chi tiết đã dựng

SpiderBench đặt camera ở street/rooftop scale, có nhân vật làm chuẩn tỷ lệ, chuyển động, parallax, depth of field và motion blur. Mỗi facade chiếm hàng trăm pixel.

City Lab thường mở bằng toàn cảnh vài kilomet. Ở góc này mỗi nhà chỉ chiếm vài pixel, nên normal map, cửa, cây, xe và chi tiết mặt đường gần như biến mất. Toàn cảnh rất hữu ích cho IOC nhưng không phải hero shot để chứng minh độ chân thực.

## Vì sao các batch vừa qua chưa đóng được khoảng cách

Ta đã chuyển được nhiều ý tưởng: semantic facade, parapet, ledge, awning, rooftop plant, traffic, tàu và wake, LOD, grade và depth-aware post. Nhưng ta mới chuyển **các dấu hiệu bề mặt**. SpiderBench có nền tảng sâu hơn: asset PBR nhất quán, geometry khu phố, temporal post, cascade shadow, street-scale camera và nhiều vòng chỉnh riêng cho từng cảnh.

WebGPU chỉ là backend. Nó cho phép pipeline tốt hơn, nhưng không tự sinh dữ liệu bề mặt, hình học hay art direction.

## Kế hoạch đóng khoảng cách

### Batch 30 — Hero Corridor thay cho tiếp tục tô toàn thành phố

Chọn một hành lang khoảng 1–1,5 km²: Bạch Đằng → Nguyễn Huệ → Lam Sơn → Đồng Khởi. Giữ toàn thành phố ở LOD vĩ mô; dồn chất lượng game vào corridor này.

1. **Render foundation:** CSM 3–4 cascade, temporal AA, AO/GTAO, SSR có mask cho kính/nước/đường ướt, volumetric haze tiết chế, quality tier và GPU timing.
2. **PBR atlas thật:** asphalt, sidewalk, curb, wall families, roof, glass/interior, signage/decal; tối thiểu albedo + normal + roughness/AO, đúng color space và anisotropy.
3. **Geometry kit:** podium, setback, balcony, cornice, cửa hàng tầng trệt, mái, HVAC, lan can, bollard, lamp, cây; instancing và HLOD.
4. **Hero identity:** 20–30 công trình/tuyến nhìn chính có geometry và texture riêng từ ảnh đúng địa điểm; phần chưa xác minh giữ generic và gắn provenance.
5. **Camera direction:** 5 camera khóa — aerial IOC, river approach, boulevard eye-level, Lam Sơn/Opera hero, night/wet close-up — cùng lens và exposure đã hiệu chỉnh.
6. **Verification:** screenshot cố định 1440p, đo GPU time theo pass, gate 30 fps trên máy demo; A/B từng tính năng, không đánh giá bằng cảm giác chung.

### Tiến độ 30B — 2026-09-27

- Hoàn thành render foundation: GTAO, TRAA, emissive bloom, sharpen, quality tier và CSM ba cascade bằng addon chính thức Three.js r186.
- Hoàn thành vertical slice Hero Corridor: Nhà hát, Continental và Caravelle đã được chuyển từ luồng legacy sang renderer WebGPU; proxy hợp nhất của ba footprint được loại để tránh chồng hình.
- Hoàn thành camera/preset `corridor` và metadata nguồn trong runtime.
- Hoàn thành public-realm PBR dọc corridor: 2 bộ CC0, 8 map 1K diffuse/normal/roughness/AO, UV theo kích thước vật lý công bố và biên nhận SHA-256.
- Chuyển manifest 20 mặt đứng cũ sang runtime WebGPU: 11 mặt ảnh được render bổ sung, 3 mặt do hero geometry thay thế; 5 mặt cần tách bề mặt và 1 vỏ lấy mẫu tiếp tục bị chặn.
- Đổi camera corridor sang góc xiên thấp, nhìn dọc trục Lam Sơn–Đồng Khởi thay cho góc top-down kiểm kê.
- SSR đã được thử theo MRT metalness/roughness nhưng bị cổng QA trực quan loại vì làm beauty pass đen khi ghép với CSM/TRAA trên cảnh này; runtime đã quay về graph ổn định.
- Chưa hoàn thành SSR có mask ổn định, volumetric haze, geometry riêng cho 20–30 công trình và GPU timing theo pass. Đây là backlog 30C–30D, không được trình bày như chức năng hiện có.

Sau Batch 30, có thể nhân corridor kit sang khu Ba Son và Thủ Thiêm. Khi có dữ liệu drone, thay LOD0 bằng photogrammetry/3DGS mà không đổi kernel.

## Quyết định

Không tiếp tục ưu tiên chỉnh palette toàn thành phố. Ưu tiên đúng là **mật độ chất lượng trên vùng demo**, rồi mới nhân rộng. Nếu không thu hẹp hero area, khối lượng 70 nghìn công trình sẽ luôn làm mọi nỗ lực chi tiết bị pha loãng.

## Nguồn

- SpiderBench: https://github.com/xikhar/spiderbench
- Three.js WebGPU post-processing: https://threejs.org/manual/pages/webgpu-postprocessing.html
- Poly Haven Aerial Asphalt 01: https://polyhaven.com/a/aerial_asphalt_01
- Poly Haven Concrete Pavement 02: https://polyhaven.com/a/concrete_pavement_02
- City Lab scene metadata: `outputs/hcmc-poc/data/scene.js`
- City Lab renderer: `outputs/hcmc-poc/webgpu-materials-24.js`
- City Lab post pipeline: `outputs/hcmc-poc/city-visual-runtime-27.js`
