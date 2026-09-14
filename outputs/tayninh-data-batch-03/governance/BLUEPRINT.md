# Batch 03 — Gia Lộc Temporal, Vegetation & Hydrology

Contractor: `/root`. Batch 03 tiếp tục chiến dịch dữ liệu công khai trước Hera, kế thừa registry và AOI mẫu của Batch 02. Mục tiêu là bổ sung chiều thời gian, cấu trúc thảm thực vật và lịch sử mặt nước để tăng giá trị phân tích cho digital twin mà không gán độ chính xác khảo sát cho dữ liệu vệ tinh.

AOI nguồn: `../../tayninh-data-batch-01/sources/aoi.json`, bbox WGS84 `[106.3276338,11.0830401,106.3576338,11.1130401]`. Đây là bbox mẫu suy ra từ OSM, không phải ranh phường Gia Lộc chính thức.

## Requirements

- R01 TEMPORAL: thu ít nhất một ảnh Sentinel-2 L2A khác thời điểm, ưu tiên cùng tile và cùng mùa với scene Batch 02 ngày 2025-11-30. Lưu TCI, SCL và các band cần thiết nếu tạo chỉ số. Hai epoch phải được kiểm CRS/grid, mây, nodata và alignment trước khi tạo lớp sai khác. Kết quả chỉ là vùng thay đổi ứng viên ở độ phân giải Sentinel; không được gọi là phát hiện công trình mới hoặc kết luận vi phạm.
- R02 VEGETATION: thu ít nhất một lớp chiều cao tán cây hoặc cấu trúc thảm thực vật công khai có dữ liệu không rỗng trong AOI. Ưu tiên ETH Global Canopy Height 10 m kèm uncertainty; nếu nguồn này không truy cập được thì dùng nguồn khoa học công khai phù hợp và ghi rõ độ phân giải, ngày, mô hình, license và giới hạn. Không được gọi raster canopy là kiểm kê cây cá thể hay LiDAR đô thị.
- R03 HYDROLOGY: thu ít nhất một lớp lịch sử/occurrence/seasonality mặt nước công khai giao AOI, ưu tiên JRC Global Surface Water. Ghi rõ product date range, resolution, class/nodata, license và bounds. Không được suy diễn thành mô hình ngập, thoát nước hoặc cao độ thủy văn đã hiệu chỉnh.
- R04 NORMALIZE: tạo derivative theo AOI và browser visual cho mọi lớp acquired. Báo cáo CRS, grid, dimensions, bounds, null/nodata, thống kê/phân bố, source-to-derived lineage và SHA-256. Với temporal, lưu thuật toán/mask/ngưỡng và thống kê vùng thay đổi ứng viên; không bịa ground truth.
- R05 REGISTRY + VISUAL: registry Batch 03 phải nhập nguyên trạng lịch sử Batch 02, thêm manifest Batch 03, fail-loud với hash/evidence/AOI/duplicate/lineage errors. Workbench key-free phải có điều khiển epoch A/B, lớp change candidate, canopy/uncertainty và water history; vector công trình/đường/nước nằm trên raster. Nguồn, ngày, độ phân giải và giới hạn phải nhìn thấy được.
- R06 VERIFY: Contractor kiểm độc lập provenance, hash, giao AOI, alignment, counts/statistics, adversarial gates, browser interaction và console. Báo cáo coverage chính xác đối với 23 review groups và 237 questions; “touched” không đồng nghĩa “answered”.

## Builder ownership

- `temporal_enrichment`: `sources/temporal`, `raw/temporal`, `derived/temporal`, manifest `sources/temporal-records.json`, TIP và Completion Report.
- `ecosystem_enrichment`: `sources/ecosystem`, `raw/ecosystem`, `derived/ecosystem`, manifest `sources/ecosystem-records.json`, TIP và Completion Report. Bao gồm vegetation và hydrology.
- `batch03_workbench`: registry, validators và Workbench Batch 03. Chỉ đọc artifacts của hai Builder dữ liệu và Batch 02.
- Contractor tích hợp, audit semantic mapping và nghiệm thu. Không sửa HCMC PoC hoặc raw data của Batch trước.

## Acceptance boundary

Batch 03 đạt khi có: một epoch Sentinel bổ sung và lớp thay đổi ứng viên đã mask/QA; một lớp vegetation/canopy không rỗng; một lớp lịch sử mặt nước không rỗng; tất cả có raw bytes, snapshot nguồn, license, hashes và derivatives; registry/gates đạt; Workbench thể hiện trực quan và tương tác được.

Deferred: ranh chính thức, địa chính/quy hoạch có thẩm quyền, GCP/CP, true ortho khoảng 1 cm, dense airborne LiDAR, survey DTM/DSM, cây cá thể, mạng thoát nước, mô hình mưa–dòng chảy/ngập đã hiệu chỉnh và ground truth biến động. Các mục này chờ chia sẻ dữ liệu hoặc payload Hera.
