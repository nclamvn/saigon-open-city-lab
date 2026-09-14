# VERIFY — Batch 04: Gia Lộc 2.5D Fusion Experience

Ngày kiểm tra: 2026-09-14  
Contractor: `/root`  
Trạng thái: **PASS — READY FOR LEADERSHIP DEMO WITH PUBLIC-DATA LIMITS**

## Kết luận

Batch 04 đã hợp nhất địa hình 2.5D, màu bề mặt Sentinel-2, footprint công trình, đường, thủy hệ, mẫu tán cây và lịch sử mặt nước vào một trải nghiệm phân tích 3D chạy cục bộ trên trình duyệt. Toàn bộ 9/9 yêu cầu trong BLUEPRINT đã có bằng chứng nghiệm thu; không còn P0 hoặc P1 mở.

Sản phẩm là baseline phân tích từ dữ liệu công khai cho vùng mẫu Gia Lộc. Nó không phải bản đồ địa chính, mô hình khảo sát, LiDAR, true ortho 1 cm, kiểm kê từng cây hay mô hình ngập.

## Phạm vi dữ liệu đã hợp nhất

| Lớp | Kết quả | Cách trình bày |
|---|---:|---|
| Địa hình COPDEM | `109×109`, 11.881 ô hữu hạn | Mesh 2.5D, cao độ 5,431–29,576 m, trung bình 14,485 m, phóng đứng 2,5× |
| Màu bề mặt Sentinel-2 | mẫu 10 m | Drape RGB trên mesh; chỉ là ảnh bối cảnh công khai |
| Công trình Microsoft | 657 footprint | Extrude theo lớp diện tích; 657/657 chiều cao nguồn là null nên mọi chiều cao đều là proxy |
| Đường OSM | 629 bản ghi nguồn | 260 tuyến đã giản lược/render để giữ tương tác mượt; số nguồn vẫn được giữ trong contract |
| Thủy hệ OSM | 1 đối tượng | Bám địa hình và có thể truy vấn |
| Tán cây ETH 2020 | 3.412 mẫu | Instanced raster samples, cao trung bình 10,2 m, không đại diện từng cây |
| JRC Surface Water | 114 ô | Occurrence, seasonality 2024 và normalized change tách thành lớp phân tích |
| Biến động JRC | 89 tăng / 25 giảm | Màu phân kỳ giữ dấu tăng/giảm |
| Nguồn và lineage | 13 nguồn | Đường dẫn, SHA-256, thời gian/độ phân giải và giới hạn sử dụng hiển thị trong source drawer |

## Ma trận yêu cầu

| ID | Kết quả | Bằng chứng |
|---|---|---|
| B04-R01 Fusion contract | PASS | `scene-data.json` có đủ contract, 13 input hash được kiểm tra; rebuild byte-stable |
| B04-R02 Terrain | PASS | DEM thật, Sentinel drape, thống kê cao độ thật, elevation mode và disclosure phóng đứng 2,5× |
| B04-R03 Buildings | PASS | 657/657 footprint; height method `area_class_proxy_no_source_height`; centroid mới nằm trong footprint/bbox; mái hướng lên |
| B04-R04 Canopy | PASS | 3.412 instance bám terrain, có modeled height/uncertainty và canopy mode |
| B04-R05 Water + roads | PASS | OSM road/water và JRC occurrence/seasonality/change là các lớp riêng, có disclosure “không phải mô hình ngập” |
| B04-R06 Experience | PASS | 6 mode, orbit/pan/zoom, bàn phím, reset, tour, inspector, legend, hướng Bắc, nguồn, collapse và hide/recover |
| B04-R07 Performance | PASS | Three.js cục bộ; geometry merged/instanced; DPR 1,5; raycast chỉ lớp nhìn thấy; canvas đo sáng được cache và lấy mẫu khoảng 1 Hz; probe tour khoảng 4 Hz; diagnostic đo render thực |
| B04-R08 Honesty | PASS | Hai nonclaim luôn hiện ở desktop/tablet/mobile; chi tiết nguồn và giới hạn được giữ khi thu gọn UI |
| B04-R09 Verify | PASS | Rebuild/hash, Python/Node syntax, HTTP asset, 6 mode, picking, keyboard, tour, responsive, numerical probe, visual và console đều pass |

**Coverage: 9/9 = 100%.**

## Kiểm thử dữ liệu và build

Các lệnh cuối dùng Python đã đóng gói của workspace vì compiler cần NumPy:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/compile_fusion_scene.py
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/test_fusion_scene.py
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m py_compile outputs/tayninh-data-batch-04/scripts/compile_fusion_scene.py outputs/tayninh-data-batch-04/scripts/test_fusion_scene.py
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check outputs/tayninh-data-batch-04/static/app.js
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check outputs/tayninh-data-batch-04/vendor/three.min.js
git diff --check
```

Kết quả: tất cả pass; `test_fusion_scene.py` trả `errors: []` với đúng 13 nguồn, 657 công trình, 3.412 mẫu canopy, 114 ô JRC, 629 đường và 1 thủy hệ OSM.

Hash cuối:

```text
scene-data.json  20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878
fusion-qa.json   32180bcae1abb429df03e64ebdbeab3ecd8a48ebf3a662fe99ca63d0a8e17bed
static/app.js    674284ca1e4ca5764d0ec658ae9ab0a4c5d37c20ba801800414c8be823dee08d
index.html       7c381ca08d24de8c7a7ef9eae7e52489270699c423f94ec04d2177dc95075fe9
static/styles.css ffc2711f196d999906277845adc0e225e76ff654b9e52ebeaa86ef4d90285021
```

HTTP smoke trả `200 OK` cho trang chính, `static/app.js`, `vendor/three.min.js` và `derived/fusion/scene-data.json` trên `127.0.0.1:8768`.

## Kiểm thử không gian và tương tác

Probe cuối trên 1280×720:

```text
rendererReady=true
sceneReady=true
litPixelRatio=0.9855
dpr=1.5
northMappingOk=true
topNormalY=1
worldYApplied=true
anchoring.maxAbsClearanceM=0
pickables=8
warnings=0
errors=0
```

- 6/6 mode chuyển đúng trạng thái và đúng nhãn/giá trị tiếng Việt.
- Phím mũi tên thay đổi camera nhưng không cuộn trang; `R` khôi phục camera.
- Tour tự di chuyển camera; probe quan sát `120 renders/s` trong phiên kiểm tra. Đây là chẩn đoán của phiên chạy, không phải benchmark phần cứng cam kết.
- Narrative collapse độc lập với global hide. Global hide giữ nút `Hiện bảng điều khiển` và nonclaim tối thiểu; telemetry ẩn/hiện đồng bộ ngay.
- Source drawer mở/đóng đúng, có 13 link evidence và đóng bằng Escape.
- Raycast thực tế chọn đúng `DEM terrain`, footprint `msft_0438`, `ETH canopy sample 1734` và `water-occurrence cell 114`.
- Sau bản vá, lớp canopy ẩn không còn thắng raycast trong Buildings mode.

## Responsive và visual QA

| Viewport | Kết quả |
|---|---|
| 1280×720 | Scene sáng, map-first, không tràn ngang; panel và dock không che vùng phân tích chính |
| 768×900 | Không tràn ngang; disclosure, mode rail, toggle UI và canvas đều hiện |
| 390×844 | Document đúng 390×844; không tràn ngang; canvas phủ viewport; disclosure và nonclaim hiện; FPS ẩn; rail 6 mode cuộn ngang |

Ảnh nghiệm thu cho thấy địa hình relief, Sentinel drape, đường, footprint, canopy và lớp nước cùng xuất hiện trong một hệ không gian. Chất lượng bề mặt còn mang đặc trưng ảnh công khai 10 m và DEM 30 m; đây là giới hạn dữ liệu, không phải lỗi render.

## Đóng các phát hiện tiền thẩm định

| Phát hiện | Đóng bằng |
|---|---|
| P0 pickables không nhất quán | Một collection `world.pickables`; boot thành công; raycast bốn loại đối tượng; lọc theo visibility |
| Centroid công trình sai do shoelace lon/lat | Shoelace trên tọa độ mét local; 657/657 kiểm tra; 0 bbox failure; 0 footprint failure; resample base elevation |
| Đảo Bắc/Nam terrain so với vector | Row 0 ở phía Bắc; sampler cùng quy ước; `northMappingOk=true` |
| Phóng đứng chỉ áp terrain | Một hàm `worldY(elevation)` áp cho mọi lớp; max clearance 0 |
| Mái công trình quay xuống | Sửa winding/axis; `topNormalY=1` |
| Metric placeholder và tiếng Anh | Nhãn/giá trị thật theo từng mode, toàn bộ tiếng Việt |
| JRC change mất dấu | 89 gain và 25 loss dùng màu phân kỳ |
| Disclosure biến mất ở tablet | Nonclaim hiển thị ở cả ba breakpoint |
| Hide UI gây ngõ cụt touch | Toggle recovery nằm ngoài shell, luôn có thể bấm |
| Scene tối/blank do fog | Fog thích ứng theo extent; `litPixelRatio=0.9855` |
| Telemetry gây allocation/readback mỗi frame | Cache canvas/context, giảm tần suất đo sáng và probe; FPS đổi thành renders/s |

## Hạng mục trì hoãn có chủ đích

Không có P0/P1 mở. Các dữ liệu sau chưa có và không được mô phỏng như dữ liệu đo thật:

- ranh hành chính chính thức, địa chính và quy hoạch có thẩm quyền;
- true ortho gần 1 cm, GCP/CP và ảnh mặt đứng;
- chiều cao công trình đo thật, DSM/DTM và point cloud LiDAR;
- kiểm kê từng cây và hình học tán cây;
- mạng thoát nước, mực nước, độ sâu ngập và mô hình thủy lực hiệu chỉnh;
- dữ liệu kiểm chứng từ payload Hera tại hiện trường.

Đây là đầu vào cho các batch sau, không làm mất giá trị của Batch 04 như một baseline hợp nhất và workbench kiểm tra dữ liệu công khai.

## Addendum — Inter typography refinement

User-authorized refinement on 2026-09-14, tracked by `TIP-B04-INTER.md` and `COMPLETION-B04-INTER.md`. The hashes above preserve the original Batch04 acceptance snapshot; the following UI hashes supersede them after this typography-only change:

```text
static/styles.css 8dd9be7d77593220bdaffb517f95e97e4a4f90bf142f232ff2a44eb8f66c832e
index.html        2cea96d21575974d578f8d10edcac98147e94b4eed57d28d8d7417a2728e2e0e
InterVariable.woff2 693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3
```

Contractor browser reverify: body and title computed family `Inter, system-ui, sans-serif`; heading weight 650; desktop line-height 33.984 px. The font is preloaded from local `static/fonts/InterVariable.woff2`, served `200 OK` with `font/woff2` MIME type and 352,240 bytes. The bundled license is `static/fonts/OFL.txt`. CSS cache version is `20260914-inter1`.

Visual and layout checks pass on 1280×720 and 390×844: document dimensions match viewport, no horizontal overflow, panel/dock separation preserved, Vietnamese accents readable and minimum disclosure visible. Temporary viewport override was reset. Console has 0 warnings and 0 errors. Engine and scene-data hashes are unchanged.

Requirement coverage: **INTER-R01–R04: 4/4 = 100%**. FontTools decoded the font; 186 Vietnamese, 8 combining and 64 representative UI code points have 0 missing glyphs. HTML/CSS static checks pass with 0 duplicate IDs, 0 obsolete families and 0 external font references. Overall typography status: **READY**. This is a reversible presentation change; no new automated test suite was introduced. Detailed checks are recorded in the Builder Completion Report.
