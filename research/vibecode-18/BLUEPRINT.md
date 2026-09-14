# Batch 18 — nguồn, streaming và chi tiết theo vùng

Ngày 14/09/2026. Chủ thầu: Codex `/root`; ba Thợ: SOURCES18, GIS18, UI18. Đây là phạm vi thi công có thể kiểm chứng, không phải tuyên bố toàn bộ Digital Twin đã nghiệm thu.

## Quyết định và phạm vi

Người dùng đã yêu cầu triển khai bước tiếp trong kiến trúc đợt 17. Theo Vibecode, Chủ thầu ghi nhận D18-01: bỏ checkpoint xin lại `APPROVED` vì phạm vi đã được người dùng trực tiếp cho phép; không có xuất bản, xóa dữ liệu hay vận hành UAV trong đợt này. Chủ thầu viết thiết kế, tài liệu, kiểm chứng; Thợ viết sản phẩm và cung cấp TIP/Completion.

Giữ City Lab và engine Three.js r128 hiện hành. Thêm một biểu diễn ảnh/địa hình có thể bật tắt, đọc COG trong Worker và chọn công trình theo LOD. Không thay nguyên trạng nguồn vector, không dùng DSM làm mặt đất rồi chồng công trình lên. Gia Lộc tiếp tục dùng contract chung nhưng chưa tự động được chuyển viewer trong phạm vi đợt này.

Ưu tiên tìm API/tệp chính thức TP.HCM và quyền tái sử dụng. Khi mới có danh mục/trang giới thiệu, giữ trạng thái đầu mối hoặc chưa tiếp nhận; không suy ra đã tải GIS/LiDAR. Trong lúc đó, dùng tài sản truy cập được, có quyền và kiểm chứng: Sentinel-2 L2A RGB, GEDTM30 địa hình mô hình và Copernicus DEM DSM nếu hoàn tất acquisition. Ảnh 10 m không thể hiện mái nhà chi tiết như orthophoto; LOD không nâng độ chính xác nguồn.

## Hợp đồng dữ liệu và tọa độ

`data/surface-18/manifest.json` có `sources` dạng array, `assets` keyed theo `imagery`, `ground`, `dsm` và tài sản phụ. Mỗi nguồn phải qua gate quyền, acquisition, CRS/units và fingerprint của SourceCore chung. Mỗi asset có URL, SHA256 của bản crop thực, tổng bytes, CRS, bbox, kích thước, bands, NoData, độ phân giải gốc/hiệu dụng, thời điểm và datum. Hash bản crop không được ghi là hash toàn tệp nhà cung cấp. Giữ cửa sổ/biến đổi và metadata tài sản gốc trong evidence.

Frame hiển thị giữ East-Up-South của HCMC đợt 17, gốc `[106.7115, 10.779]`. Raster north-up, tọa độ tại tâm pixel; nội suy bilinear và xử lý NoData phải giống nhau giữa nền, công trình và overlay. Cao độ ground là mét trong datum nguồn EGM2008; Y hiển thị bằng cao độ nguồn trừ `referenceHeightM` tại gốc. Đây là tham chiếu hiển thị tương đối, không phải chuyển EGM2008 sang cao độ ellipsoid hay hệ đo nghiệm thu địa phương.

3D Tiles tiêu chuẩn dùng ENU và root transform East/North/Up → ECEF; `boundingVolume.box` ở ENU. glTF Y-up giữ mesh East-Up-South, nên bước chuẩn xoay X +π/2 đưa glTF sang Z-up trước root transform. Catalog phụ `bboxLocal/centerLocal` giữ East-Up-South cho GLTFLoader nội bộ, bỏ qua bước chuyển chuẩn này. Viewer nội bộ chỉ đọc subset do producer này xuất, chưa là decoder 3D Tiles đầy đủ hoặc conformance chứng nhận. [Đặc tả CesiumGS](https://github.com/CesiumGS/3d-tiles/blob/main/specification/README.adoc)

HTTP Range phải trả 206, Content-Range và strong ETag đúng phiên bản asset. Worker từ chối 200 toàn tệp hoặc ETag/total bytes sai. Fingerprint offline cộng ETag máy chủ ràng buộc phiên bản COG; không tuyên bố browser đã hash toàn COG hay chứng minh từng block bằng Merkle proof.

## Tiêu chí nghiệm thu

| ID | Kết quả yêu cầu | Bằng chứng bắt buộc |
|---|---|---|
| R18-01 | Điều tra đầu mối chính thức TP.HCM, trạng thái và quyền chính xác | Registry cùng URL, ngày kiểm, phản hồi truy cập |
| R18-02 | Tiếp nhận ảnh Sentinel thực, epoch và AOI chất lượng | Crop/hash/profile; SCL cloud/shadow/NoData trên AOI |
| R18-03 | Ground GEDTM mô hình; DSM tách vai trò | CRS/datum/scale, crop/profile và mô tả giới hạn |
| R18-04 | COG tiled/overviews có provenance | QC layout, kích thước/bytes/hash; không upsample rồi đổi GSD |
| R18-05 | Gate SourceCore được dùng cho raster | Tests nguồn thiếu quyền/hash/CRS bị chặn |
| R18-06 | Range transport đúng và ràng buộc phiên bản | GET/HEAD 206, suffix/open-end, 416, ETag/hash |
| R18-07 | Đọc window/overview trong Worker, native-resolution cap | Tests và probe network/render với vùng thật |
| R18-08 | Cache/budget/cancel/stale/NoData hữu hạn | Tests lỗi và counters thực, không im lặng fallback toàn tệp |
| R18-09 | Nền, công trình, đường/thủy hệ cùng tham chiếu ground | Kiểm sampler; screenshot toàn cảnh và cận cảnh |
| R18-10 | Actual GLB/tileset nhiều mức, ID nguồn ổn định | Binary/accessor/bounds/identity tests trên dataset thật |
| R18-11 | Trục glTF/ENU/ECEF đúng và adapter phạm vi rõ | Numeric oracle hai đường biến đổi và tài liệu |
| R18-12 | Chọn LOD theo camera có ngân sách | Tests selection/cache; probe khi zoom/pan |
| R18-13 | Tích hợp panel kính, collapse và kích thước nhất quán | Screenshot desktop/viewport thực; không tăng hàng nav |
| R18-14 | Ảnh thật cận cảnh đúng địa điểm, quyền/credit/native zoom | Trải nghiệm thực; điều kiện SfM/3DGS giữ tắt khi thiếu bộ ảnh |
| R18-15 | Day/night/photo/keyboard và phân tích 17 được khôi phục | GUI regression, chuyển mode rồi query/điều hướng |
| R18-16 | Runbook, fingerprint và Verify có phạm vi trung thực | Completion ba Thợ, tổng hợp QA và URL demo thực |

Không nghiệm thu COPC/3DGS/photogrammetry/CityGML/PostGIS/hydrology/geometry quy hoạch trong đợt này nếu chưa có tài sản hoặc triển khai hợp lệ. Viewer cũ vẫn tải scene ban đầu: streaming nhánh mới không đồng nghĩa startup toàn ứng dụng đã được chuyển sang streaming.

## Căn cứ lựa chọn nguồn và thư viện

GeoTIFF.js pin bản ổn định 3.0.5/MIT, có window/overview/abort, làm việc trong Worker; không dùng beta hoặc nâng engine toàn bộ chỉ để có thư viện mới. [Release 3.0.5](https://github.com/geotiffjs/geotiff.js/releases/tag/v3.0.5), [GeoTIFF.js](https://github.com/geotiffjs/geotiff.js/).

GEDTM30 là mô hình ước lượng terrain toàn cầu, không là LiDAR địa phương. Tài sản thực tiếp nhận trong đợt này là v1.2, datum EGM2008, có lớp bất định và kỳ dữ liệu ghi 2006–2015; không coi ngày release là ngày đo. Producer ghi mục đích thử nghiệm. [Release nguồn](https://github.com/openlandmap/GEDTM30/releases), [Bài báo nguồn](https://pmc.ncbi.nlm.nih.gov/articles/PMC12296579/).

Copernicus DEM là DSM có công trình/cây; chỉ dùng làm lớp bề mặt độc lập. Sentinel là dữ liệu quan sát; chất lượng cloud cần đo trong AOI, không lấy tỷ lệ toàn granule thay thế. [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM), [Quyền Sentinel](https://cds.climate.copernicus.eu/licences/ec-sentinel).
