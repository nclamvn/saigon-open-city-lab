# S07 — Khu mẫu chi tiết và nạp cảnh theo ô

Contractor `/root`, 14/09/2026. Người dùng đã yêu cầu triển khai đề xuất07A/B/C. Blueprint approval/review checkpoint riêng được bỏ theo judgment: thay đổi local reversible đã được yêu cầu, không phát hành ngoài hoặc commit/push. Contractor thiết kế/điều phối/verify; Builder code và Completion. Không chờ payload mới.

## Outcome

Chọn ô mẫu250×250m quanh cụm `msft_0615`, cùng canonical frame S06. Cải thiện bề mặt quan sát được bằng material assets thật có rights; vật liệu/chi tiết giả định vẫn là mô phỏng. Có registry20 công trình mục tiêu và ảnh đã đối chiếu nếu tìm được. Nếu ảnh thiếu/GPS hoặc quyền chưa đủ, giữ pending/không phủ ảnh; receipt chứng minh tìm kiếm, không tự gán ảnh khác địa điểm. Mục tiêu ảnh10–20 không phải dữ liệu đã có.

Tích hợp vào Batch04 hiện hành, giữ stable IDs, nativeRGB10m và metadata/nulls. Chia mô hình/chi tiết theo ô và giới hạn cache/LOD; xử lý phân ô/chuẩn hóa descriptor qua Web Worker thực. Importer có chức năng thật cho metadata raster/GeoJSON/GLB với fixtures và validation, chưa giả là đọc được mọi GeoTIFF/LAS hoặc đã có khảo sát.

## Requirements

| ID | Output / kiểm chấp nhận |
|---|---|
| S07-A01 | Registry20 targets, search receipts và ảnh thực đã verified hoặc pending; location/rights/góc/ngày/provenance từng record; không giả10–20 ảnh đã có |
| S07-A02 | Gói vật liệu miễn phí từ provider có giấy phép/đường tải hợp lệ; albedo/normal/roughness hữu dụng ở1024–2048px hoặc mức nêu rõ; filehash/dimensions/map type/physical scale và memory budget |
| S07-A03 | Manifest ô mẫu từ actual canonical footprints/frame; IDs/bounds/center chính xác; inputs S06/C05/raw immutable |
| S07-B01 | Renderer dùng gói material thật với colorSpace đúng, meter-scaleUV, bounded texture cache và fallback; ảnh nền native không bị thay |
| S07-B02 | Mái/tường/cửa nhìn gần có chi tiết mô phỏng tốt hơn trong ô mẫu: ribs/seams/frame/recess/sills/fascia có ràng buộc footprint/envelope; không thêm sự kiện địa điểm chưa biết |
| S07-B03 | Cây đồ họa có foliage/thân/nhánh tự nhiên hơn vàLOD; giữplacement/exclusion masks S06; analyticETH raster riêng |
| S07-B04 | QA hình học/envelope/winding/nonfinite/intersection và cachedtexture lifetime vẫn pass; evidence before/after chức năng, Completion rõ |
| S07-C01 | Ô/chunk geometry thực chỉ có detail gần camera, manifest/stable IDs và bounded cache/LOD; không chỉ đổivisibility toàn bộ finegeometry đã prebuild |
| S07-C02 | WebWorker thực phân ô/prepare descriptor, request IDs/stale cancellation, errors/fallback; DOMprobe chứng minh worker used, jobs và timings |
| S07-C03 | Importer thật cho rastermetadata+georegistration, GeoJSON footprint và GLB model với provenance gates; fixtures hợp lệ/lỗi; futurepayload không tự available |
| S07-C04 | Switchsource/scale/height atomic, camera/panel state giữ, sourcebytes unchanged; disposal/cache không tăng qua vòng; errorfallback rõ |
| S07-C05 | UI ô mẫu/materialA/B/ảnhnguồn cócollapse; Interglass và widths giữ; pendingphotos/minh bạch mô phỏng/observed; linksregistry vàmetadata |
| S07-C06 | Sixmodes/pick/nav/tour/reset/hide/mobile giữ; versioned assetkeys/probe architecture/material/tiles/importer; rendering idleon-demand |
| S07-C07 | Numericgeometry/worker/importer/perf tests cần thiết + actualbrowser desktop/mobile/control/resource closure; không tự hứa FPS/accuracy |

14requirements. Tiling/worker là đầu tư mở rộng được user approved trong đề xuất; không chuyểnengine/Cesium toàn bộ. Sourcephotos cóthể thiếu là trạng thái data acquisition thật, không fabricatedasset.

## Task graph / ownership

S07-A DATA → gói assets/registry/manifest (độc lập research); S07-B SURFACE → consumes assets, chỉ geometry/module mới và existing solution-layer; S07-C ENGINE → consumes Bexports + Amanifest, app/UI/chunk/worker/importer; ContractorVerify. Ba Builder chạy song song với boundaries không overlap.

- A: `derived/s07/**`, `sources/s07/**`, `scripts/s07-collect*`, `scripts/s07-prepare*`, `scripts/s07-data*`, `governance/COMPLETION-S07-DATA.md`, `governance/SCAN-S07-DATA.md`.
- B: `static/solution-layer.js`, `static/s07-surface.js`, B-only QA scripts/receipts, `governance/COMPLETION-S07-SURFACE.md`, `SCAN-S07-SURFACE.md`. Không app/UI/worker/data.
- C: `static/app.js`, `index.html`, `static/styles.css`, `static/solution-ui.js`, `static/s07-{chunks,worker,importer,ui}.js`, C-only QA scripts/receipts, `governance/COMPLETION-S07-ENGINE.md`, `SCAN-S07-ENGINE.md`. Không solution-layer/surface/data.
- Root: Blueprint/TIPs/Verify/README và độc lập QA; không productcoding.

## Interface decisions

A manifest canonical centroid/bbox aroundS06focus. Texture manifest path is `derived/s07/materials/manifest.json`, scene/target manifest `derived/s07/sample-manifest.json`, evidence registry `sources/s07/photo-registry.json`. A reports exact schemas early to B/C.

B public API extends `B04SolutionLayers` or adds `B04S07Surface` (browserglobal). `buildingLayer(ctx, features,heightFor)` S06 signature stays usable for C/offlineQA. New fine geometry is opt-in via ctx; ctx may include material library/sample bounds/LOD. C controls readiness/sourcechange/cache and passes bounds/detail settings; B handles geometry. B announces exact additional API before Cintegration. Pure worker/importer never needs THREE/WebGL.

Keep modeltype/provenance semantics correct: photo of material is not photo of GiaLộc house, SR/synthetic texture is not observedRGB, generic roof/floors/species not observed facts. Inputs current9hashes/nulls/657IDs stay immutable. No UAVflightfeatures/contact/buy/publish.
