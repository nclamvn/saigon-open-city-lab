# Completion — C05 TECHNIQUES

Builder: `/root/surface_enrichment`. Hoàn thành ngày 14/09/2026 theo [TIP-C05-TECHNIQUES.md](TIP-C05-TECHNIQUES.md). Phạm vi hoàn thành là nghiên cứu kỹ thuật, kiểm source chỉ đọc và bounded GEDTM30 pilot; chưa triển khai thay renderer hoặc tích hợp DTM live.

## Deliverables

- [research/techniques.md](../research/techniques.md): diagnosis Batch04, 12 nhóm kỹ thuật, phân biệt quan sát/mô hình/độ đẹp/accuracy, roadmap P0–P3 trước Hera và blockers.
- [research/technique-sources.json](../research/technique-sources.json): top-level array **13 record**; mỗi record có prerequisites, trustworthy/modeled output, điều không thể khôi phục từ 10 m, geometry/accuracy constraints, tooling/license, compute/fit, blockers và primary evidence. Record 13 là GEDTM30 dataset/input pilot.
- [evidence/techniques/acquisition-index.json](../evidence/techniques/acquisition-index.json): **39 nhóm primary**, **107 snapshot** gồm docs/papers, provider metadata, pinned repository commits, README và licenses.
- [evidence/techniques/batch04-source-audit.json](../evidence/techniques/batch04-source-audit.json): hash 7 input Batch04, excerpt code có dòng và diagnostic. Không sửa input.
- [evidence/techniques/gedtm-pilot/qa.json](../evidence/techniques/gedtm-pilot/qa.json): COG acquisition, GeoTIFF/PNG/world metadata, exact-bounds resampling, raw Range bytes/headers/checksums và so COPDEM.
- [evidence/techniques/validation.json](../evidence/techniques/validation.json): hash/schema/links/source pin/static checks; scripts tái lập nằm cùng evidence directory.

## Findings đóng

Native Sentinel **330×334, 10 m** đã tồn tại và bytes giữ nguyên; fallback **109×109** là đường degraded riêng. Không lặp lại kết luận native hiện hành vẫn bị downsample về DEM. Diện tích footprint median **106,21 m²** tương đương **1,0621 pixel diện tích** ở 10 m; **617/657** footprint nhỏ hơn 400 m². Không coi phép chia diện tích/GSD² là exact pixel-intersection count.

COPDEM là DSM **109×109**, relief **24,145 m**; phóng đứng **2,5×** làm relief hiển thị **60,3625 m**. Buildings **657/657 height nguồn null**, proxy 4/6/9/12 m. Renderer lấy một base ở trung bình các đỉnh: kiểm reimplementation dự báo **776/3.103 đỉnh** có chênh base–DSM >1 m tại 2,5×, cực trị **−8,24/+8,20 m**. Đây là diagnostic mô hình nội bộ, chưa phải runtime raycast độc lập hoặc sai số khảo sát. Canopy hiện là continuous field 361×361, **coneCount 0** và **không cộng canopy height vào meshY**.

Roadmap ưu tiên **P0 texture load/UV/LOD + terrain 1×/1,35× + foundation QA**, sau đó **P1 deterministic mái/mặt đứng PBR mô phỏng** trên footprint nguồn. Mái/height/material unknown vẫn null trong observed fields, chỉ thêm modeled fields và disclosure. SfM/MVS/NeRF/3DGS cần actual calibrated multiview capture; 3DGS không mặc nhiên là mesh đo đạc. SR giữ là reconstructed layer riêng; B04 TCI 3-channel chưa đủ input RGBNIR 4-band của LDSR-S2; hai epoch cách năm không phải stable multiframe burst. DSen2 20/60→10 m không chứng minh 10 m RGB→chi tiết nhà dưới mét.

License được phân biệt: original Inria 3DGS research/noncommercial, gsplat Apache-2.0, Spark/SuperSplat MIT; HighRes-net Apache-2.0 **cộng modified DoNoHarm**, không ghi Apache-only. Code/engine license không thay license data, photo, weights hay assets. Somethingbig article chỉ được dùng như primary self-reported pipeline và visual matched-camera review; không coi là independent survey accuracy.

## GEDTM30 acquisition và QA thực

Nguồn: Zenodo **18887460**, v1.2 publication 06/03/2026, description chỉ đúng external COG 30 m + RF spread; không tải file đính kèm 240 m. Snapshot metadata và README nằm ở evidence/baseline/providers do Contractor thu, được reference/hash trong record 13. Dataset **CC BY 4.0**, release ghi testing-only; modeled DTM chưa có field checkpoints Gia Lộc.

| Kiểm | DTM | RF prediction spread |
|---|---:|---:|
| Grid provider AOI window |109×109|109×109|
| Pixel spacing |1 arc-second (~30 m)|1 arc-second (~30 m)|
| Horizontal CRS |EPSG:4326|EPSG:4326|
| TIFF vertical tag |EGM2008/EPSG:3855|EGM2008/EPSG:3855|
| Dtype / scale / offset |Float32 /1 /0|Float32 /1 /0|
| Valid / nodata pixel |11.881 /0|11.881 /0|
| Min / max / mean, m |3,8 /25,7 /12,950|0,17 /4,42 /0,729|

Giữ **6 raw Range response files**, provider headers, Content-Range, URL, captured time và SHA256; tổng **13.238.272 provider byte**, không tải global raster. Original-grid GeoTIFF window 109×109 giữ mẫu gốc và cover AOI; PNG 109×109 alpha mask theo pixel-center inclusion, world metadata ghi bounds/grid. Có thêm **108×108 GeoTIFF exact AOI bounds**, bilinear, không gọi là native samples hoặc tăng resolution. Raster actual nodata value **3,402823466×10³⁸**; hiện không có nodata trong window.

COPDEM bilinear registered trên GEDTM provider grid, **11.881 cặp valid**: DSM−DTM mean **1,535 m**, median **1,202 m**, p05/p95 **0,048/4,359 m**; **497 pixel âm**. Relief GEDTM **21,900 m**, COPDEM resampled **24,145 m**. Hiệu số là so hai sản phẩm; không suy ra height cây/nhà hoặc sai số thực địa. RF spread không phải site RMSE/confidence guarantee. **DTM pilot chưa integrated/live**; phóng đứng vẫn là P0 cần kiểm độc lập.

## Verification

`python3 outputs/tayninh-imagery-campaign-05/evidence/techniques/validate-research.py` từ workspace root: **0 errors**; **136 unique referenced files** kiểm SHA256; 13 records đủ field/top-level array; 39 sources có primary snapshot, 17 repos pin 40-hex commit; local report links tồn tại; Python scripts AST parse; raw Range totals/status 206 và exact-AOI metadata khớp. **7/7 Batch04 input hashes unchanged**. PNG DTM được mở kiểm: 109×109, nonempty grayscale stretch và AOI alpha; không phải ảnh quang học.

OpenCV docs alias và 4.13 endpoint HTTP403; repo path đầu thử sai HTTP404. Đã recovery chính tutorial `doc/tutorials/features/homography/homography.markdown` ở official pinned commit, lưu attempts. Không hạ source criterion xuống secondary blog.

| Artifact | SHA256 |
|---|---|
| technique-sources.json |61acc9a2e9c39555f71cab220afbe5e75652666536912eab9c3a9b05a0d8de68|
| techniques.md |e05063c3cdf70e1dc7ef8b9436c9f7ba3e063bc8d0e5fa5a5fd51cb33a5cd80b|
| acquisition-index.json |e49817e352a6ba352cc3e9b6e627e0b3514aa804dd6562693c2ada3f1931cb8b|
| batch04-source-audit.json |e04a3d709826979b12053b6b7feb4c35baaec756f9d6c7aed182ff9cb35c992f|
| gedtm-pilot/qa.json |f7127dfcb9039f0e2b24648782fa397f8348b47d766849cbb464db934801157d|

## Acceptance

| AC | Result | Evidence |
|---|---|---|
|C05-T01 primary verified breadth|PASS|12 technique families + GEDTM input, 39 primary groups/107 snapshots.|
|C05-T02 input/output/accuracy separation|PASS|Every record separates trustworthy/model/unrecoverable; no synthesized detail called observed city; geometry/survey limitations explicit.|
|C05-T03 concrete roadmap + diagnosis|PASS|Current native/canopy corrections acknowledged, DSM 2,5×/foundation diagnosis, P0/P1 actionable before Hera, later-capture/SR/stereo blockers.|
|C05-T04 report/records/evidence/Completion|PASS|Deliverables, snapshot/raw hashes, scripts and0-error validation receipt.|

Remaining limits: chưa runtime-implement roadmap, chưa thu địa phương multiview/photo/SR/mesh/splat, chưa independent checkpoints hoặc camera-matched local photo review. Research PASS không đáp ứng true ortho ~1 cm, measured building heights, individual trees, urban dense LiDAR hay flood/drainage model. Chỉ thay Campaign 05 owned research/evidence/Completion; Batch04 và các batch dữ liệu giữ nguyên.
