# CONTRACTOR VERIFY — Batch 01 Gia Lộc / Tây Ninh

Ngày kiểm định: 2026-09-14  
Chủ thầu: `/root`  
Quyết định: **READY WITH DEFERRED ITEMS**

Batch 01 đạt mục tiêu làm nền dữ liệu có thể kiểm chứng và dùng thử cho vùng mẫu Gia Lộc. Quyết định này không xác nhận ranh hành chính chính thức, độ chính xác đo đạc, trực ảnh 1 cm, LiDAR, DTM/DSM khảo sát hoặc mức hoàn thành digital twin.

## Phạm vi và mức hoàn thành

- Blueprint R01–R05: **5/5 yêu cầu đã triển khai, 100% phạm vi Batch 01**.
- Registry: **18 hồ sơ** gồm 7 `acquired`, 9 `candidate`, 2 `blocked`, 0 input thiếu.
- Dữ liệu đã thu có ích trực tiếp cho thử nghiệm không gian: 629 way đường OSM, 1 way kênh OSM và 1 ô Copernicus DEM GLO-30 bao AOI. Snapshot kết hợp 630 way là bản kiểm tra lặp, không được đếm như một lớp chủ đề mới.
- Bằng chứng bổ sung đã lưu: Nghị quyết 1682, metadata relation OSM và phản hồi truy vấn building 0 phần tử. Phản hồi 0 chỉ chứng minh khoảng trống OSM tại thời điểm truy vấn.
- 7 tệp acquired duy nhất có tổng dung lượng 50,370,160 byte; 17 snapshot nguồn duy nhất.
- Mức chạm yêu cầu hiện tại: 6/23 nhóm review và 4/237 câu hỏi trong hai hồ sơ tham chiếu. “Chạm” nghĩa là có dữ liệu đầu vào liên quan, không đồng nghĩa đáp ứng trọn yêu cầu.

## Kết quả kịch bản nghiệm thu

| Kịch bản | Kết quả | Bằng chứng |
|---|---:|---|
| AC1 — Danh tính hành chính và tính trung thực AOI | PASS | NQ1682 xác nhận phường Gia Lộc mới; `officialBoundary: null`; bbox được ghi rõ là vùng mẫu từ OSM, không phải ranh phường. |
| AC2 — Vector thực giao AOI | PASS | 629 way `highway`, 1 way `waterway`; building query trả 0 và được gắn nhãn data gap. |
| AC3 — Raster địa hình thực giao AOI | PASS | Copernicus DEM GLO-30 3600×3600, EPSG:4326, tile [106,11,107,12]; cửa sổ AOI 109×109 pixel. |
| AC4 — Provenance và quyền sử dụng | PASS | Mọi record có URL, snapshot, hash, evidence span, trạng thái, giới hạn; nguồn chưa rõ quyền dùng nằm ở candidate/blocked. |
| AC5 — Registry fail-loud | PASS | 18/18 record hợp lệ; 0 error, 0 warning. Sáu bite test đều từ chối hash sai, snapshot thiếu, acquired thiếu file, extent fallback lệch, extent AOI lệch và evidence thiếu. |
| AC6 — Workbench cho lãnh đạo | PASS | Trang tải đủ 18 card; tìm “Copernicus” còn 1 card; lọc “Bị chặn” còn đúng 2 card; trả “Tất cả” có 18 card. |
| AC7 — Sức khỏe trình duyệt và mã tĩnh | PASS | 0 console error/warning; `node --check` đạt; `git diff --check` đạt. |

## Kiểm tra độc lập của Chủ thầu

- SHA-256 Copernicus DEM trên đĩa: `49cea98dfdc9e721659dacf85b2e9e58334cc753bb94d52d0854681c51fa15bf`.
- SHA-256 registry tất định: `a891f5d6a4bc20684b79dc9692e13915ee8e5f3c55b2a70f2f172fcaec48e608`.
- DEM: 1 arc-second, 3600×3600; cửa sổ AOI có 11,881 pixel hữu hạn, 0 NaN, min 5.4308 m, max 29.5758 m, trung bình 14.4855 m. Các trị số chỉ là mẫu DSM/DEM công khai khoảng 30 m; vertical datum chưa được xác nhận độc lập.
- OSM combined snapshot: 630 way = 629 highway + 1 waterway; hash `c72cd5e36b96e94eb55de72f1a5ae3e497572d7228089ab8e476d559813f1a3e`.
- Trình duyệt đã kiểm ở `http://127.0.0.1:8768/tayninh-data-batch-01/` bằng trạng thái trợ năng và kiểm đếm DOM; không có lỗi console.

## Các hạng mục bắt buộc còn hoãn

1. Ranh phường Gia Lộc dạng máy đọc do cơ quan có thẩm quyền cung cấp; pilot bbox hiện tại không dùng để tính diện tích hoặc độ phủ toàn phường.
2. Footprint và chiều cao công trình: OSM trả 0 building; cần nguồn Open Buildings/Overture hoặc ảnh và LiDAR Hera về sau, kèm kiểm định thực địa.
3. Trực ảnh GSD 1 cm, LiDAR/point cloud, DTM/DSM khảo sát, mốc khống chế và hệ cao độ: chưa có nguồn công khai tương đương yêu cầu hồ sơ.
4. Ảnh quang học, lớp phủ đất, mặt nước lịch sử, canopy và GEDI mới ở mức candidate; cần tải asset đúng AOI, ngày chụp, mây, license và uncertainty.
5. Dữ liệu chuyên ngành trên cổng Tây Ninh có record `isopen=false` hoặc license null phải qua rà soát quyền trước khi dùng lại.

Không có blocker kỹ thuật đối với việc dùng Batch 01 làm nền cho Batch 02. Các hạng mục hoãn là blocker đối với tuyên bố “digital twin chính xác/toàn phường” và mọi sản phẩm đo đạc hoặc quản lý nhà nước chính thức.
