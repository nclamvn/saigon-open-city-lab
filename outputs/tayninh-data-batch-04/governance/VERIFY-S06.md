# VERIFY S06 — áp dụng vào bản đồ Gia Lộc hiện hành

Contractor `/root`, 14/09/2026, nghiệm thu độc lập bằng dữ liệu nguồn, Node và trình duyệt iAB. Kết quả: **14/14 yêu cầu S06 đã triển khai và kiểm tra, coverage 100%; không có yêu cầu Missing trong batch này.** Đây là nghiệm thu phần nâng cấp bản đồ thử nghiệm, không phải chứng nhận hoàn thành toàn bộ Digital Twin hay độ chính xác đo đạc.

## Bản bàn giao

- Bản đồ: http://127.0.0.1:8768/tayninh-data-batch-04/?v=s06-final&focus=cluster
- URL không có `focus=cluster` bắt đầu ở tổng quan toàn vùng. Chọn **Đến cụm nhà** để xem rõ chi tiết.
- Renderer `s06.2`; supplement `tayninh-s06-solution-data/v1`; tài nguyên UI/app/module dùng cache key `s06-final`.
- Bản đồ đang chọn GEDTM thử nghiệm, chiều đứng 1×, chiều cao Google đủ hỗ trợ và chi tiết mô phỏng. Không còn viewport QA hoặc server QA 8770 chạy khi bàn giao.

## Coverage

| REQ-ID | Kết quả | Bằng chứng |
|---|---|---|
| S06-D01 | PASS | C05 Google/GEDTM đã vào supplement; 9 fingerprint nguồn, epoch/CRS/datum/quyền/nodata được giữ; SHA-256 đối chiếu byte nguồn |
| S06-D02 | PASS | 657 polygon WGS84 gốc được lấy mẫu với presence mask; 482 đủ điều kiện, 175 proxy; kiểm độc lập không có sai khác count/admission/median ngoài làm tròn |
| S06-D03 | PASS | Đăng ký tâm pixel và canonical frame; 11.881 node GEDTM hợp lệ, 217 kernel biên được ghi rõ; kiểm lại native raster bằng phép nội suy độc lập |
| S06-D04 | PASS | Compiler, data contract, deterministic payload, 4 lỗi nguồn/template bị bắt; 5 template tương lai đầy đủ field, đều null và chưa khả dụng |
| S06-E01 | PASS | 8 tổ hợp terrain × scale × height qua QA hình học; browser đổi nguồn/tỷ lệ đồng bộ, metric GEDTM 4,2–24,4 m, trung bình 12,9 m |
| S06-E02 | PASS | Móng chia theo cạnh/tam giác terrain; 25.292 ray mỗi tổ hợp, 0 miss/over-tolerance; test cố ý dịch móng 0,5 m phát hiện lỗi |
| S06-E03 | PASS | Mái nằm trong footprint, tổng cao gồm mái đúng envelope; 6 texture PBR dùng chung; actual screenshot desktop/mobile thấy mái/cửa/material; nhãn mô phỏng rõ |
| S06-E04 | PASS | 628/629 đường bám TIN, 0 centroid mặt đường xuyên footprint; vegetation không ô lưới và qua mask/exclusions; ETH raster liên tục tách khỏi cây đồ họa; nước/JRC có QA riêng |
| S06-E05 | PASS | On-demand, merged/instanced/LOD/cache/disposal; sau 2 vòng đổi nguồn và làm nóng sáu mode: geometry14, texture8, pickables12 không tăng; CPU/render/rebuild có probe |
| S06-E06 | PASS | Actual pick hai công trình, keyboard/pointer/zoom/tour/reset/hide; browser QA thiếu supplement vẫn mở scene COPDEM/proxy với nguồn bổ sung bị khóa |
| S06-U01 | PASS | Actual desktop1440×900, viewport887×998 và mobile390×844; Inter/glass; panel desktop344px, mobile374px; scrollWidth bằng clientWidth |
| S06-U02 | PASS | 11 test state-contract; 8 thao tác nguồn/tỷ lệ/height/detail thực tế; 4 nhóm pressed-state theo engine, unavailable/busy/error được phản ánh |
| S06-U03 | PASS | Focus cụm thật trên footprint, stable ID; drawer có nguồn C05, metadata, 9 fingerprint và 5 template chưa có dữ liệu; nội dung lựa chọn được refresh khi rebuild |
| S06-U04 | PASS | Canvas focusable tabindex0, label tiếng Việt, native buttons; tour/hide/restore; Inspector/Source/options collapse phù hợp màn hình nhỏ; Node/browser không lỗi ở bản chính |

## Scenario và severity

| Scenario | Kết quả cuối | Severity nếu lỗi |
|---|---|---|
| Boot nguồn đầy đủ, frame và admission | PASS: schema đúng, 657 source IDs, admitted=true, 9 fingerprints; GEDTM/Google khả dụng | High |
| Đổi GEDTM/COPDEM, 1×/1,35×, Google/proxy | PASS: 8 thao tác đầu và 12 lượt đổi tiếp theo; model/proxy hiển thị 482/174 hoặc 0/656, móng vẫn 0 miss | High |
| Mái, móng, đường, nước, JRC, cây | PASS: kiểm tam giác/raycast/mask đầy đủ trong receipts; actual screenshot không còn chấm cây đặt đều theo ô lưới | High |
| Sáu chế độ | PASS: overview/elevation/buildings/canopy/water/change, visible flags và metric phù hợp; tán cây là raster 361×361/119.438 pixel hợp lệ | Medium |
| Đóng Inspector rồi đổi địa hình với options đang mở | **Đã phát hiện và sửa**: trước sửa tự mở Inspector/đóng options. Sau sửa 8 thao tác giữ Inspector.hidden=true, Source.hidden=true, options.open=true | Medium |
| Chọn công trình trực tiếp | PASS: click chọn `msft_0615` Google 4,44 m và `msft_0309` proxy 9,00 m; phương pháp/giới hạn khác nhau đúng | Medium |
| Camera | PASS: Right pan x736,45→747,72; Q xoay; + radius1936,96→1704,52; − hoạt động; R radius1936,96; native kéo trái xoay, wheel125→80; tour start/stop, focus125 m | Medium |
| UI dành không gian bản đồ | PASS: hide có opacity0/pointer-events:none; restore hoạt động; mobile Inspector dạng bottom sheet, options/nguồn collapse và scroll-bounded | Medium |
| Thiếu supplement | PASS: bản QA sao chép static/index, giữ baseline qua symlink, cố ý không có solution-data.json. Browser sceneReady=true, admitted=false, GEDTM/Google disabled, COPDEM/proxy, cảnh báo đúng | High |
| Đầu vào sai | PASS: 23 fixture admission fail-loud; 4 data negative bites; 4 regression panel-refresh không ghi thuộc tính hidden | High |
| Resource/idle | PASS trong phạm vi thử: geometry14/texture8/pickables12 ổn định giữa hai vòng; đứng yên không render liên tục; 0 console error/warn bản chính | Medium |

Các lỗi đăng ký tọa độ phát hiện trong quá trình làm đã sửa: dùng góc thay tâm pixel GEDTM; lấy WGS84 từ công thức inverse không đúng compiler; khác hệ số mét/độ giữa fusion và visual. Không còn finding High/Critical mở trong phạm vi QA đã thực hiện. Mouse pan chuột phải được giữ trong code và hướng dẫn; lượt native QA này xác nhận pan bằng bàn phím, chưa tự động drag chuột phải. Không dùng kết quả preview cũ làm nghiệm thu final.

## Technical health định lượng

| Kiểm tra | Kết quả |
|---|---|
| Node syntax, app/module/UI bản cuối | 3/3 PASS, 0 syntax error |
| State-contract UI | 11/11 PASS |
| Admission fixture âm | 23/23 PASS; input không bị mutation; GEDTM thiếu thật bị disabled |
| Data negative bites | 4/4 PASS: hash sai, input thiếu, template thiếu field, template tự bật available |
| Passive panel-refresh regression | 4/4 PASS, 0 hidden-attribute writes, selected payload cập nhật |
| Product/input/evidence hash + source hash | 22 + 9 đối chiếu độc lập, 0 mismatch |
| Tổ hợp hình học | 8/8: 0 roof-outside, 0 downward roof-face, 0 nonfinite, 0 road-in-building |
| Móng mỗi tổ hợp | 25.292 actual-THREE rays trên 656 nhà; 0 misses/tolerance failures |
| Đường mỗi tổ hợp | 98.692 actual-THREE rays; 0 misses/tolerance failures |
| Tổng cao mái/tường/cửa | Sai khác xây dựng Float32 tối đa 0,000001891 m; không phải sai số đo tại thực địa |
| Nước/JRC natural receipt | 2.360 ray nước và 2.232 ray mỗi mode JRC, 0 misses/tolerance failures |
| Vegetation | 1.200 candidates; 0 mask/exclusion violations; deterministic; không phải cây cá thể đã phát hiện |
| Native Google độc lập | 657 polygon; 482/175 trùng admission; 0 count/median mismatch ngoài làm tròn tối đa0,000500 m |
| Native GEDTM độc lập | 11.881 node và uncertainty; height khác tối đa5,01×10⁻⁷ m, uncertainty5,00×10⁻⁷ m; 217 edge kernels |
| Canonical raw polygon độc lập | Sai khác tối đa7,03×10⁻⁷ m; frame cũ có sai khác trong AOI tới10,56 m trước chuẩn hóa |
| Browser đổi nguồn đầu tiên | Rebuild khoảng350,1–411,6 ms; detail toggle0,4–0,5 ms; camera/focus không full rebuild |
| Browser sau làm nóng | Tour 90 samples: median CPU submit0,2 ms, p95 0,3 ms; 7 draw calls ở tour,10 ở góc cụm chi tiết; GPU/FPS không được đo hoặc bảo đảm |
| Khởi tạo shader/driver | Có chi phí lần đầu: trước panel-fix reload247 ms một submit; không dùng số này làm tốc độ steady-state |
| Bộ nhớ sau hai vòng | geometry14, texture8 (gồm6 procedural), pickables12; mức ổn định qua các vòng, không phải chứng minh vô hạn không leak |
| Idle bản cuối | Counter865→865 trong khoảng ghi hồ sơ mà không thao tác; idle=true, loadingHidden=true, options đóng |
| Lint/build/typecheck dạng npm | N/A: ứng dụng static, không có package/toolchain đó. Node syntax, data/geometry/admission/UI và actual browser là các check áp dụng |

Browser probe là JSON DOM `#b04Probe`; mirror có throttle nên giá trị ngay sau thao tác có thể thuộc frame trước. QA đọc trạng thái sau khi ổn định. CPU submit bao gồm CPU/driver, không phải GPU render time. Geometry raycast kiểm cảnh dựng với terrain tam giác đang render, không kiểm độ chính xác của DEM hay chiều cao mô hình ở địa phương.

## Fingerprint bản cuối

| Artifact | SHA-256 |
|---|---|
| static/app.js | `2cfec906129e0670553937530601fcdf28e4ebb4a9bdda18abf7ac06f9077410` |
| static/solution-layer.js | `b1ffc0a2e7ab343a0a72fb809e2c38b004a6aa0d418231445d1491b42f2d36ef` |
| static/solution-ui.js | `9dc9e1d683766f64a67e12d4a357129a18a3a793a68ba02dc771324907d9dd09` |
| derived/solution/solution-data.json | `caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3` |
| derived/solution/solution-qa.json | `952e2de5f90a49c67b9f934a0038db7661ab8b0c99b5ed4fc45304a9a1f25b3a` |
| Baseline fusion/scene-data.json | `20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878` |
| Baseline visual/visual-data.json | `215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682` |

Chi tiết nguồn và geometry receipts: `../scripts/engine-s06-qa/`. Audit adapter `AUDIT-S06-ADAPTER.md` kiểm pure admission/module và dữ liệu; app snapshot audit trước thay đổi panel-refresh. Thay đổi cuối chỉ refresh nội dung Inspector giữ hidden, đã có regression receipt và Contractor browser kiểm lại.

## Readiness và giới hạn còn lại

**READY cho bản đồ thử nghiệm S06 và demo phương pháp.** Source → compiler/QA → scene descriptor → semantic admission → renderer lớp → tương tác là nền đã chạy thực. Không cần chờ payload để tiếp tục chuẩn hóa và tích hợp các nguồn công khai.

- Nguồn có657 footprint, renderer656 vì `msft_0165` ngoài miền mesh tâm pixel; đường629/628 và mỗi JRC mode114/113. Nguồn gốc/support/IDs được giữ. 13 xung đột centerline OSM với footprint được lưu để đối soát, không tự dịch đường nguồn.
- RGB vẫn native330×334/10 m; S06 không giải quyết bằng dữ liệu quan sát mới việc đọc chi tiết mái/mặt đứng thực. C05 chưa xác minh bộ RGB miễn phí dưới1 m dùng được đúng AOI; cần tiếp tục đối soát nguồn có vùng phủ, quyền và chất lượng.
- GEDTM dự đoán2006–2015/EGM2008 chỉ thử nghiệm; COPDEM DSM chưa xác minh hệ cao tại chỗ. Cả657 source_height_m còn null và measured_height=false. Mái/cửa/vật liệu/vị trí cây là mô phỏng.
- 5 mẫu adapter tương lai là hợp đồng chưa có payload; chưa triển khai reader/ETL production cho mọi orthomosaic, LiDAR hoặc SfM. Cần bổ sung importer/chunking/spatial QA theo format thực và nguồn thực ở phase tương ứng. Contract hiện tại kiểm657 ID của AOI này; tái sử dụng TP.HCM cần manifest/AOI contract riêng.
- Đổi nguồn vẫn full rebuild350–412 ms trên môi trường thử này; chưa streaming background worker hoặc tiling quy mô toàn tỉnh/thành phố. Kiến trúc/module/cache/metrics hiện tại tạo cơ sở đo và thay thế có kiểm chứng.
- Chưa có true ortho1 cm, LiDAR, địa chính, mesh đo thực hay mô hình ngập/thoát nước hiệu chỉnh. Không dùng S06 để công bố các mức chính xác ấy.

Chủ thầu giữ TIP, Completion của ba Builder và Verify này. Checkpoint review riêng được bỏ theo judgment vì người dùng đã yêu cầu áp dụng ngay vào bản đồ local; không phát hành bên ngoài, không commit/push trong batch này.
