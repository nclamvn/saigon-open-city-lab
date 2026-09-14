# Contractor Verify — Batch 07

Contractor `/root`, 14/09/2026. Người dùng yêu cầu triển khai Batch 07 trên bản đồ hiện hành. Builder tách dữ liệu, vật liệu/hình học, engine/UI; một lượt audit độc lập kiểm importer và Worker/cache. Contractor kiểm lại file nguồn, chạy CLI và thao tác bản đồ qua browser thật.

**OVERALL: READY với dữ liệu còn chờ.** Phạm vi phần mềm Batch 07 đã thực hiện **14/14 requirement, 100%**. Không còn lỗi P0/P1 được phát hiện còn mở trong phạm vi đã kiểm. Trạng thái này không có nghĩa đã đạt ảnh khảo sát chi tiết hay digital twin đo đạc hoàn chỉnh.

## Requirement coverage và acceptance

| Requirement | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| A01 Registry ảnh | PASS | 20 target thật trong canonical frame, 0 ảnh mặt đứng verified; quyền/GPS/ngày/góc chưa có giữ pending. Biên nhận có phạm vi; không kết luận toàn Internet thiếu ảnh. |
| A02 Material pack | PASS | 4 vật liệu CC0 hoạt động, 12 map albedo/normal/roughness; 15/15 file map kể cả inactive khớp SHA-256 và kích thước; khoảng 56 MiB trong ngân sách 64 MiB. |
| A03 Sample manifest | PASS | Tâm `[928.023355,-778.339734]`, ô 250 × 250 m, 52 tâm công trình trong ô; 57 footprint giao ô; 5 giao biên không dựng trùng. 9/9 source fingerprint không đổi. |
| B01 PBR/UV/cache | PASS | Runtime dùng ảnh material, sRGB albedo/linear normal/roughness, UV mét, 12 map bounded/fallback/dispose. RGB quan sát 330 × 334, 10 m giữ nguyên. |
| B02 Fine buildings | PASS | Fine geometry nạp cho ô gần; có khung/cửa/bậu/mép mái/đường mái và kiểu mái đa dạng. 57 công trình trong fixture hình học, 0 lỗi ngoài footprint/vượt envelope/UV không liên tục. Chi tiết là mô phỏng. |
| B03 Vegetation | PASS | Thân/nhánh/cụm lá có LOD, giữ mask và exclusions S06; fixture 3 cây kiểm geometry/material. Lớp analytic ETH vẫn liên tục, 0 cone, không phải kiểm kê cây. |
| B04 Numeric QA | PASS | Surface/material scripts PASS; fine fixture 19.836 tam giác bổ sung cho 57 công trình, 0 projectedOutside/aboveEnvelope/UV discontinuity. Đây là số fixture, không gán thành số runtime 52 công trình. |
| C01 On-demand chunks | PASS | Browser tổng quan khởi động cacheFine=0, active=[]; chọn cụm mới tạo chi tiết. Cache tối đa 4 ô; fixture nhiều ô xác nhận ownership/eviction/disposal; dữ liệu mẫu thực chỉ có 1 ô. |
| C02 Worker | PASS | Browser Worker used=true, job completed=1, không error/fallback; timing thực khoảng 2–3 ms worker và 10–15 ms roundtrip ở các lượt quan sát. 10/10 audit độc lập kiểm worker/cache/admission. |
| C03 Importer | PASS | 27/27 audit độc lập; 22 negative cases Builder đều bị từ chối. UI thật kiểm raster metadata, GeoJSON và GLB một triangle với byte SHA-256. Hash sai bị chặn. Importer là validation-only, publish=false; chưa có decoder GeoTIFF/LAS/full glTF. |
| C04 State/disposal | PASS | Source/scale/height commands hoàn tất không error, cùng camera radius125. Inspector `msft_0626` đổi 4,22 m Google→9 m proxy và khôi phục; bảng đã đóng vẫn đóng. Bộ nhớ trở lại 15 geometries/16 textures sau các vòng. |
| C05 UI | PASS | Inter, glass, A/B cùng camera, registry/receipts/material links, kỹ thuật có collapse. Mobile 390 × 844 không overflow; collapsed panel khoảng 217 px thay vì 542 px; mở rộng hiện stats/hồ sơ/importer. |
| C06 Navigation/modes | PASS | Sáu mode, pick, phím mũi tên, Q, zoom, tour/stop, reset, hide/restore hoạt động. A/B/elevation giữ nhà qua coarse fallback, nút aria và active cập nhật. Idle rendering dừng khi đứng yên. |
| C07 Independent verification | PASS | CLI, source hashes, material dimensions, 37/37 tài nguyên HTTP, desktop/mobile và input/file preservation đã kiểm trực tiếp. Log error/warn mới trống. Performance là CPU submission, không phải GPU/FPS cam kết. |

14 acceptance rows PASS, 0 FAIL; severity open: P0=0, P1=0 trong phạm vi kiểm.

## Technical health định lượng

- Audit importer độc lập: **27/27** (4 positive, 23 negative), 0 open findings.
- Audit Worker/cache/app admission độc lập: **10/10**, 0 open findings. Bao gồm stale generation, timeout/boot fallback, cache tối đa 4, eviction/disposal, disabled-quality và effective-active guards.
- Builder engine fixture: 1 GLB triangle hợp lệ, **22/22** input lỗi bị từ chối; chunk và integration guards đều PASS. Cũng kiểm các semantics không hỗ trợ để từ chối rõ, tránh âm thầm bỏ node transform, material, morph, animation hoặc extensions.
- Builder surface và material checks: **2/2 PASS**. Map nguồn/runtime **15/15** hash và dimensions đúng; runtime hoạt động 12 map. Source S06 fingerprint **9/9** đúng; 657/657 chiều cao đo thực vẫn null, 0 measured.
- Asset/link closure local HTTP: **37/37** trả 200, bao gồm code, manifests, map hoạt động và biên nhận.
- Syntax 5 JS engine/importer/chunks/worker/UI PASS; `test_solution_layers.py` PASS, gồm 4 negative bites cho source/template contract.
- Sáu mode browser **6/6**, không exception mới. Mobile document/viewport đều **390 × 844**, Inter được áp dụng, không scroll ngang.
- Browser tại cụm radius125: 656/657 footprint được dựng trong miền terrain, base604 + sample52; Google482/proxy174. Một footprint ngoài miền pixel-center được khai báo, không clamp vào mép.
- Runtime sau các vòng source: **15 geometries/16 textures**, không tăng so với cùng góc nhìn/trạng thái trước. Số texture này là số WebGL đã dùng, khác ngân sách map/library chung.
- Tour: 90 mẫu CPU/driver submission gần nhất median0,2 ms, p950,3 ms, max0,4 ms ở lượt ghi. Không phải đo GPU/FPS; boot có chi phí nạp/shader cao hơn. Idle counter ổn định, không chạy render liên tục.

## Findings đã đóng

1. Helper boot thiếu làm scene không lên: bổ sung và xác nhận browser sceneReady=true.
2. UV tường reset theo segmentation, seam mái có nguy cơ ngoài polygon: sửa UV và geometry, thêm fixture dốc/concave/winding/envelope.
3. GLB chỉ kiểm header, GeoJSON/raster malformed bị nhận: giải mã mesh subset, kiểm accessor/index/bounds/affine/topology, hash từ byte, từ chối semantics ngoài subset.
4. Panel remount mất JSON/FileList: giữ node file input, text/select/cursor/focus; browser GLB đúng rồi hash sai trên cùng tệp hoạt động, input giữ qua A/B.
5. A/elevation mất 52 sample houses: sửa generation key chỉ gồm phần ảnh hưởng geometry, admission theo detail/mode, coarse fallback theo fine hiệu lực; screenshot A và elevation xác nhận nhà hiện lại.
6. Boot dựng sẵn sample fine dù ở xa: bỏ force tại cả setup và rebuild. Browser cuối cacheFine=0 trước khi focus.
7. Mode button giữ active/UI stale và fresh chunk ẩn: cập nhật admission sau applyMode, đặt object mới visible khi admit, audit mới PASS.
8. Mobile collapsed vẫn quá cao: chỉ giữ S07 head/A-B trong collapse, mở rộng mới hiện chi tiết.

## Dữ liệu còn chờ và phạm vi chưa đạt

**20/20 hồ sơ mặt đứng còn pending, 0 ảnh địa điểm verified.** Không có ảnh nền dưới mét mới được xác minh cho đúng vùng mẫu trong đợt tìm có phạm vi này. Giữ nguyên Sentinel 10 m; không phóng ảnh AI thành dữ liệu đo. Vật liệu ảnh là ảnh của bề mặt generic, không phải ảnh nhà Gia Lộc.

Chưa có LiDAR, DTM/DSM khảo sát, true ortho 1 cm, chiều cao đo từng nhà, kiểm kê cây, ranh hành chính/địa chính chính thức, full glTF/GeoTIFF/LAS ingestion, backend phát hành 3D Tiles chuẩn hay mô hình ngập đã hiệu chỉnh. Các mục này ngoài phần mềm Batch 07 đang nghiệm thu, không bị đánh dấu đã đạt.

## Reproduce và snapshot

Xem [README-S07](../README-S07.md) để mở bản demo, dữ liệu và cách thao tác. Danh sách SHA-256 của code/data/Completion cuối được lưu tại [FINAL-FINGERPRINTS-S07.json](FINAL-FINGERPRINTS-S07.json). Ghi nhận lỗi sớm và các giới hạn phép kiểm tại [QA-S07-NOTES.md](QA-S07-NOTES.md).

Contractor không sửa code sản phẩm; các sửa lỗi được gửi lại Builder, rồi verify bằng code freeze và UI thực. Không commit/push, publish hay bay UAV trong Batch này.
