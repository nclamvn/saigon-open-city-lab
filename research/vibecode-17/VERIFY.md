# VERIFY — RtR Digital Twin Core 17

Ngày 14/09/2026. Chủ thầu: root. Trạng thái: **READY cho phạm vi đợt 17** — lõi nguồn/vector và trải nghiệm phân tích TP.HCM. Đây không phải nghiệm thu toàn bộ Digital Twin của hai tài liệu Gia Lộc, hoặc xác nhận độ chính xác khảo sát.

## Kết quả triển khai

Một lõi độc lập engine được tích hợp vào City Lab hiện có: nguồn/adapter tọa độ/QC → GeoJSON → GIS Worker/chỉ mục → lớp chọn 3D → báo cáo. Có cấu hình TP.HCM và Gia Lộc, CLI verify/prepare/import quarantine, bản gốc không bị sửa. Đợt này không tải thêm ảnh/point cloud đo kiểm cho TP.HCM; tận dụng và chuẩn hóa dữ liệu đã có, bổ sung registry đầu mối chính thức và nghiên cứu kỹ thuật từ nguồn sơ cấp.

TP.HCM chuẩn hóa 70.719 biểu diễn, gồm 70.709 biểu diễn building và 10 khối minh họa bị loại khỏi thống kê GIS; 70.701 ID nguồn phân biệt. Gia Lộc chuẩn hóa 657 footprint; artifact `prepared/gia-loc-17a` có QC và `published:false`. Các con số không là số nhà/thửa vật lý đã kiểm kê. Plugin phân tích đã áp dụng vào TP.HCM; UI Gia Lộc chưa được thay.

## Nghiệm thu 16 yêu cầu riêng đợt 17

| ID | Kết quả | Bằng chứng |
|---|---|---|
| R17-01 | PASS | Hai cấu hình, roundtrip/trục Bắc–Nam và mismatch-origin tests; generic project slug/GeoJSON import |
| R17-02 | PASS | Catalog 13/6 record; hash asset thực; capture/release/model epoch/resolution tách riêng; lead không nhập |
| R17-03 | PASS | Tests missing/NC rights, modeled survey, independent QC, terrain-only hydrology, procedural capture, approved planning; chưa có đầu vào thì gate giữ tắt |
| R17-04 | PASS | Dataset HCMC đầy đủ và Gia Lộc thực đều normalize không loại hình học hợp lệ; ID biểu diễn/ID nguồn/height provenance/illustrative giữ riêng |
| R17-05 | PASS | UI vẽ 3 điểm + Enter thực, Escape và chuyển panel dọn capture; tests invalid/outside/partial coverage |
| R17-06 | PASS | Holes, concave, centroid-outside, edge-only, MultiPolygon, actual clipping và oracle GEOS |
| R17-07 | PASS | Buffer mét/offset fixture; đường Nguyễn Huệ thực ID341504312: 46/92/224 ID ở25/50/100m; A/B/C mang nhãn phép thử |
| R17-08 | PASS | Identity grouping/overlap union tests; UI và export tách representation, source identity, summed clipped area và unique union |
| R17-09 | PASS | RBush/Worker lifecycle tests, lỗi/timeout/reinit/cancel/stale; actual30MB Worker endpoint và actual browser verified byte ingest |
| R17-10 | PASS | Actual browser A/B/C giữ camera; overlay4 objects thay vì tạo hàng trăm mesh riêng; tắt overlay dispose |
| R17-11 | PASS | Desktop/mobile screenshot được nhìn;390px không overflow, nav/drawer cùng360px; collapse/badge; uppercase keys không xung đột draw và keyboard khôi phục |
| R17-12 | PASS | Actual downloads JSON/CSV/HTML, query SHA và input byte integrity; Python CSV parser xác nhận380 rows,13 columns,17 metadata,362 feature records; escaping fixtures |
| R17-13 | PASS | Cold explicit facades, explicit night, day overview, drawing stop director, plugin switching; root live Times Square/night/arrow navigation;0 page JS errors |
| R17-14 | PASS | ARCHITECTURE-AND-SOURCES có trích nguồn sơ cấp; README contract/CLI/Worker limits và DEMO-17-HUONG-DAN; tách implemented/planned |
| R17-15 | PASS | Hai fixture trên dữ liệu HCMC:3+3 scenario, independent Shapely/GEOS selection/intersection/union và spherical ring area khớp trong tolerance1e-6 |
| R17-16 | PASS | UI render→screenshot→root nhìn→sửa: kết quả lên trên fold, setup tự collapse, path thành TubeGeometry; Completion và QA artifact thực |

**16/16 yêu cầu R17 đạt trong phạm vi đã nêu.** Không cộng chúng thành “đạt237/237” câu hỏi tham khảo Gia Lộc. Số đo toán học có kiểm chứng khác với chất lượng địa lý, hiện trạng hoặc đo kiểm nguồn.

## Kiểm chứng cụ thể

- Core: **76/76 tests PASS**,0 fail/cancel/skip; gồm35 SourceCore và41 GIS. Root chạy suite kết hợp trong Node, exit0, khoảng5,78s; không là benchmark GPU. `qa/core-suite-summary.json` ghi lệnh/kết quả.
- UI: **14/14 functional checks PASS** trong `qa/ui-results.json`; hồi quy/exports/hash: **18/18 PASS** trong `qa/regression-results.json`. Có actual browser Worker và download thật,0 page JS errors. Chromium headless-shell software đã timeout trước khi có kiểm tra; được thay bằng full Chromium/Metal và chạy lại đạt. Không lấy lần timeout làm bằng chứng passed.
- Oracle: **6/6 scenario PASS**. Shapely2.1.2/GEOS3.13.1 đối chiếu đúng toàn bộ ID biểu diễn giao, intersection và unary union; pyproj3.8.0/PROJ9.8.1 ghi khác biệt mô hình ellipsoid riêng. Buffer boundaries là hình học đầu vào oracle; generation buffer được kiểm độc lập bằng meter-offset fixtures, không tự nhận GEOS đã kiểm toàn bộ thuật toán buffer Turf.
- Cú pháp bản chốt: **9/9 JavaScript check PASS** (4 module core,2 UI/bridge,2 script QA và Turf vendored); **26 file fingerprints** trong `qa/release-fingerprints.json`, có hash scene gốc vẫn khớp.
- Catalog: **3/3 output CHECK match**; byte integrity và admissionReady của HCMC/Gia Lộc đều true cho dữ liệu vector hiện có. `qa/hcmc-local-verification.json`, `gia-loc-local-verification.json` giữ gate từng nguồn và lý do bị chặn.
- Root review: **7/7 kiểm tra chức năng/thị giác PASS** trong `qa/root-visual-review.json`. Đã nhìn desktop/mobile screenshot và live CUA bản đồ ban ngày, cảnh đêm, mặt đứng Times Square, nguồn và phím Right. Phím Right dịch target khoảng18m ở mặt đứng; dữ liệu quan sát lấy từ public DOM probe.

## Các sửa lỗi có bằng chứng

Chuẩn hóa nguồn giờ thực thi quyền/hash/CRS/units ngay trong normalize, không chỉ hiển thị gate tư vấn. Nguồn survey tự khai không đủ QC và height survey chưa chứng thực bị chặn. Hình học hole/MultiPolygon chồng sai bị loại; empty/Point/Line input không trở thành building. CLI giữ bản gốc/QC cho input held, chống ghi đè và symlink escape, phân byte integrity khỏi admission.

Worker tính hash và parse JSON trong luồng riêng trước normalize. Raw bytes không fallback bỏ kiểm; legacy object vẫn ghi unverified. Reinit đang boot/query cô lập generation/timer; kết quả hash hoặc query cũ không thay dataset mới. UI query hash chỉ commit cùng result hợp lệ; CSV giữ đủ metadata và real CRLF.

Trong UI, kết quả ban đầu nằm dưới nhiều điều khiển; đã đưa summary lên trước và collapse setup. Đường phân tích mảnh khó nhìn; chuyển path sang tube có chiều rộng mét. Draw/đến vùng dừng director/tour/follow và camera transition. Cold-load explicit-view timer cũ có thể chạy trước khi facade view đăng ký; leadership boot kiểm view đã đăng ký và replay một lần120ms, giữ yêu cầu URL. Hồi quy cold facade đã đạt sau sửa.

## Giới hạn thực tế và bước tiếp

- Native HCMC vẫn engine Three.jsr128 và nền phẳng; chiều cao/procedural/photo surfaces giữ provenance cũ. Đợt17 không tăng độ nét hoặc độ đúng ảnh từng công trình.
- GIS hiện dùng mô hình cầu WGS84 và buffer azimuthal-equidistant16 arc steps. Oracle ghi diện tích ellipsoid WGS84 khác khoảng0,402% ở mẫu Nguyễn Huệ; đây là khác biệt phép đo, chưa là sai số XY/Z nguồn. Sàng lọc hiện tại chưa dùng cho địa chính/bồi thường/đào đắp nghiệm thu.
- Bộ query cục bộ ≤2độ, buffer≤1.000m,≤1.000đỉnh, mặc định≤20.000 bbox candidates; UI128điểm và5–500m. Vượt giới hạn báo lỗi, không cắt ngầm. Phân tích toàn thành phố cần server/spatial database cùng contract và benchmark.
- Cancel loại kết quả cũ ngay nhưng không dừng CPU clipping đồng bộ đang chạy trong Worker. Timeout terminate Worker rồi cần init lại. Legacy render loading/đồ họa còn ngân sách riêng, không có tuyên bố FPS toàn cảnh mới.
- Contract RtR nội bộ chưa certified STAC/OGC. CLI mới ingest một footprint GeoJSON WGS84; chưa decode raster/LAS/BIM/mesh hoặc transform CRS chiếu. Có raster fingerprint khác với đã hợp nhất terrain của hai ứng dụng.
- Chưa có orthophoto1cm, surveyed LiDAR/DTM/DSM, đăng ký SfM/3DGS, BIM as-built hoặc geometry tương lai được duyệt mới. COG/COPC/3D Tiles/CityGML và PostGIS là các adapter/service đã thiết kế lộ trình, chưa nhận đã triển khai. Các đầu mối official chưa có raw data/quyền thì giữ lead.
- Gói `SAIGON-3D.html` lịch sử chưa chứa công cụ17. Demo hiện hành chạy HTTP với hai thư mục HCMC và shared cạnh nhau. Không commit/push/publish trong yêu cầu này.

Bước kỹ thuật tiếp theo là acquisition nguồn chính thức có quyền và streaming raster đúng độ phân giải/CRS, đăng ký terrain/overlay đồng bộ; sau đó chunks3D Tiles có feature IDs/LOD và cận cảnh từ bộ ảnh nhiều góc thật. Sa bàn100năm chỉ ingest phiên bản có nguồn/trạng thái, không tự sáng tác hình học quy hoạch.

Không còn lỗi critical/major được phát hiện trong phạm vi R17 sau kiểm thử. Những năng lực chưa có đầu vào và migration production được giữ trong roadmap, chưa tính đã nghiệm thu. Hướng dẫn demo: `outputs/DEMO-17-HUONG-DAN.md`; quyết định/checkpoint và TIP/Completion nằm trong thư mục này.
