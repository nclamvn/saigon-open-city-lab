# Kiến trúc triển khai Digital Twin RtR

Rà soát nguồn sơ cấp ngày 14/09/2026. Đây là thiết kế kỹ thuật và lộ trình triển khai; không phải xác nhận dữ liệu thành phố đã được cung cấp hoặc hệ thống đã đạt mọi chuẩn được nêu.

## Cách tổ chức giải pháp

RtR nên sở hữu một lõi dữ liệu và phân tích, nhiều bộ cấu hình địa phương và nhiều giao diện phục vụ công việc. Hình ảnh 3D là một sản phẩm của lõi; nó không thay thế cơ sở dữ liệu công trình, phiên bản nguồn hoặc bằng chứng chất lượng.

Đợt 17 vận hành phần vector: hợp đồng nguồn, adapter tọa độ, khoanh vùng, hành lang, giao/hợp, thống kê và báo cáo trên City Lab TP.HCM. Gia Lộc có cấu hình dùng cùng contract. Địa hình, ảnh phủ và LOD đã làm ở Gia Lộc chưa được tự động chuyển toàn bộ vào engine TP.HCM. Tệp DOCX Gia Lộc được coi là yêu cầu tham khảo, không là nguồn tọa độ mới cho TP.HCM.

Đề xuất pipeline lâu dài:

```text
Discovery → Acquisition/quarantine → Validation → Canonical data
                                            ↓
                             Quality contract / capability gate
                                            ↓
                         Analysis services + visualization products
                                            ↓
                         Scenario / version / evidence-rich report
```

Quarantine giữ bản gốc, hash, URL, quyền sử dụng và biên bản kiểm tra. Không sửa ngược tệp nguồn. Một nguồn chưa rõ quyền hoặc mới chỉ tìm thấy trang giới thiệu được lưu để tiếp tục điều tra, không đưa vào lớp phân tích. Hash phát hiện thay đổi tệp; hash không chứng minh tọa độ hoặc nội dung là đúng.

## Các chuẩn và kỹ thuật chọn theo vai trò

| Vai trò | Căn cứ kỹ thuật | Áp dụng cho RtR | Trạng thái đợt 17 |
|---|---|---|---|
| Tìm và mô tả nguồn | STAC 1.1.0 dùng Item/Catalog/Collection để mô tả tài sản theo không gian và thời gian. | Registry có epoch, bbox, assets, quyền và phiên bản; phase tiếp theo xuất STAC và kiểm bằng schema chính thức. | Contract nội bộ; không tự nhận STAC API/conformance. [Đặc tả STAC](https://github.com/radiantearth/stac-spec) |
| Ảnh/DEM dung lượng lớn | COG tổ chức GeoTIFF thành tile/overview, kết hợp HTTP Range để đọc phần cần thiết. | Giữ raster gốc; xây overviews cho toàn cảnh và tile gốc cho cận cảnh; không nội suy rồi gọi là ảnh độ phân giải cao. | Hướng triển khai raster kế tiếp. [OGC COG 1.0](https://docs.ogc.org/is/21-026/21-026.html) |
| LiDAR phân cấp | COPC là LAZ 1.4 tổ chức octree, cho phép đọc theo vùng/mức chi tiết bằng byte range. | Khi có point cloud hợp lệ: giữ CRS/datum/classification, xây COPC, phục vụ cận cảnh theo ngân sách điểm. | Chưa có decoder/viewer COPC ở City Lab. [Đặc tả COPC 1.0](https://copc.io/) |
| Mô hình 3D quy mô lớn | 3D Tiles 1.1 hỗ trợ phân cấp, glTF và metadata cho streaming nội dung 3D. | Chunk theo không gian, giữ feature-ID xuyên LOD, chọn mức theo sai số hiển thị; tọa độ GPU tương đối tâm để giảm rung. | Cảnh HCMC hiện vẫn là engine r128 cũ; migration riêng sau benchmark. [Đặc tả OGC 3D Tiles 1.1](https://docs.ogc.org/cs/22-025r4/22-025r4.html) |
| Ngữ nghĩa và phiên bản đô thị | CityGML 3.0 có mô hình công trình/giao thông, Versioning và Dynamizer. | Object graph phân biệt building/part/road/tree và phiên bản hiện trạng/phương án; ghi thời điểm đối tượng thay đổi và thời điểm hệ thống biết thay đổi. | Feature contract bước đầu; chưa encode CityGML. [Hướng dẫn CityGML 3.0](https://docs.ogc.org/guides/20-066.html) |
| Nhận diện đối tượng qua nguồn | GERS cung cấp ID tham chiếu toàn cầu của Overture. | Giữ GERS khi có; OSM-ID/GERS cùng tồn tại. Việc liên kết hai nguồn cần bảng matching có bằng chứng, không gộp chỉ vì khối chồng lên nhau. | Giữ ID nguồn và quy tắc đếm rõ ràng. [Overture GERS](https://docs.overturemaps.org/gers/) |
| GIS tương tác trong trình duyệt | Turf có area địa lý và buffer theo khoảng cách; phiên bản 7.4.0 sửa các phép boolean. | Pin bản vendored, Worker và chỉ mục; kiểm lỗ/khối lõm/giao biên, thống kê diện tích hợp loại phần trùng. Số đo hiện là ước lượng sàng lọc. | Implement đợt 17. [Area](https://turfjs.org/docs/api/area), [Buffer](https://turfjs.org/docs/api/buffer), [Turf 7.4.0](https://github.com/Turfjs/turf/releases/tag/v7.4.0) |
| GIS phục vụ sản xuất | PostGIS ST_Intersects có kiểm bounding box và sử dụng spatial index khi phù hợp. | Dịch vụ truy vấn server cho toàn thành phố, geometry trong CRS phân tích được lựa chọn và kiểm chứng; giữ cùng contract trả kết quả cho UI. | Chưa triển khai database/service; client có giới hạn xử lý tường minh. [PostGIS ST_Intersects](https://postgis.net/docs/ST_Intersects.html) |
| Dựng hình từ ảnh thực | COLMAP cung cấp SfM và Multi-View Stereo. | Chỉ dựng mesh từ bộ ảnh đủ overlap, đúng công trình và quyền; kiểm registration, reprojection và độ phủ trước đưa lên bản đồ. | Chưa dựng photogrammetry từ 20 ảnh đơn lẻ. [COLMAP](https://colmap.github.io/) |
| Cận cảnh thị giác | gsplat cung cấp rasterization/training cho Gaussian Splatting. | 3DGS là lớp quan sát cận cảnh có đăng ký tọa độ, query vẫn chạy trên hình học chuẩn. Không dùng độ đẹp của splat làm bằng chứng đo đạc. | Chưa có bộ ảnh phù hợp hoặc splat địa phương. [gsplat](https://github.com/nerfstudio-project/gsplat) |
| Chiều cao từ LiDAR | PDAL hag_nn cần điểm ground đã phân lớp để tính HeightAboveGround so với mặt đất nội suy. | Phân biệt Z tuyệt đối, cao trên đất, DTM/DSM và CHM; không lấy raster height rồi coi là Z nền. | Hợp đồng dữ liệu chuẩn bị; chưa có pipeline LiDAR HCMC. [PDAL hag_nn](https://pdal.io/en/stable/stages/filters.hag_nn.html) |
| BIM/CAD tích hợp GIS | IFC CRS và IfcMapConversion mô tả hệ tham chiếu, phép đổi từ tọa độ kỹ thuật; không thay thế phép chiếu trắc địa. | Kiểm units, CRS, xoay/scale/offset, datum và điểm khống chế; BIM thiết kế và as-built phải là phiên bản riêng. | Chưa có IFC georeferenced đã kiểm định. [IFC CRS](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcCoordinateReferenceSystem.htm), [IfcMapConversion](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/lexical/IfcMapConversion.htm) |
| Mô phỏng nước | HEC-RAS 2D mô tả điều kiện biên lưu lượng/mực nước và precipitation. | Ngập phải có địa hình phù hợp, thoát nước, mưa/triều, điều kiện biên và hiệu chỉnh; mặt nước đẹp không phải mô hình ngập. | Capability giữ tắt khi thiếu đầu vào. [HEC-RAS 2D](https://www.hec.usace.army.mil/confluence/rasdocs/r2dum/latest/boundary-and-initial-conditions-for-2d-flow-areas) |

Các công nghệ trên không có một phương án duy nhất “tiên tiến nhất” cho mọi nguồn. Tiêu chí lựa chọn của RtR là tính đúng với loại dữ liệu, khả năng kiểm chứng, giấy phép, tốc độ theo quy mô và khả năng thay nguồn mà giữ giao diện.

## Chất lượng có thể kiểm chứng

Mỗi kết quả phải chỉ rõ phạm vi nguồn, epoch, geometry version, phép tính, đơn vị và loại dữ liệu. `captureDate=null` được giữ nếu không biết; ngày release hoặc ngày download không được thay vào. Sai số chỉ nêu khi có phép kiểm độc lập và mục tiêu nghiệm thu đã thống nhất. Không tự đặt ngưỡng centimet vào hai tài liệu tham khảo nếu chúng chưa quy định.

LOD tăng chất lượng hiển thị và giảm dung lượng; LOD không tạo thêm độ chính xác nguồn. Hiển thị ở hệ tọa độ cục bộ giúp GPU ổn định; các phép đo nghiệm thu sau này cần CRS/datum phân tích đã xác định. Bộ đếm hiện tại phân biệt số biểu diễn, số ID nguồn và số công trình thực đã xác minh. Diện tích giao cộng các biểu diễn có thể trùng; diện tích hợp cần thuật toán loại phần trùng.

AI cần dataset có provenance và split theo không gian/thời gian để kiểm tra khả năng tổng quát hóa. Chọn vùng thiếu/khó, gán nhãn có người duyệt và đo precision/recall/IoU theo lớp; giữ kết quả bất định trong danh sách review. Ảnh sharpen hoặc super-resolution chỉ tạo sản phẩm thị giác phụ, không thay tệp gốc hoặc mở năng lực đo kiểm. Đây là thiết kế RtR đề xuất; đợt 17 chưa đào tạo mô hình AI mới hoặc công bố chất lượng dự báo.

## Áp dụng trước cho TP.HCM

Nguồn đã có: mặt bằng OSM/Overture được chuyển sang contract chung, chiều cao giữ nguyên provenance ước lượng/thuộc tính/tầng, ảnh tham chiếu công trình có quyền theo từng tệp. Những ảnh này chưa đủ để dựng hình học đo đạc toàn công trình. Vùng City Lab khoảng 38,57 km² không được ghi thành đã phủ toàn TP.HCM sau thay đổi địa giới.

Các đầu mối chính thức đáng ưu tiên lấy dữ liệu: danh mục dữ liệu mở năm 2026; GIS quy hoạch 1/2.000; dữ liệu công trình bảo tồn; các báo cáo có ghi lịch sử LiDAR/địa hình. Danh mục hoặc báo cáo công khai không chứng minh đã có API truy cập không cần tài khoản hoặc quyền tái sử dụng tệp thô. Registry phải giữ chúng ở trạng thái lead cho đến khi acquisition/rights/QC hoàn tất. [Danh mục dữ liệu mở TP.HCM](https://shtp.hochiminhcity.gov.vn/danh-muc-du-lieu-mo-cua-thanh-pho-ho-chi-minh-962.htm)

Google Open Buildings Temporal có raster cung cấp 0,5 m nhưng độ phân giải hiệu dụng 4 m; dùng để bổ sung ước lượng/biến động, không thay ảnh mái nhà 0,5 m hoặc orthophoto 1 cm. [Google dataset](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1)

Quy hoạch “100 năm” phải gắn nguồn văn bản, trạng thái dự thảo/phê duyệt và hình học đúng phiên bản. Khi chưa lấy được lớp hình học đáng tin cậy, giao diện chỉ hiển thị nguồn/lộ trình được chứng minh, không tự dựng skyline tương lai.

## Trình tự nâng cấp tiếp theo

1. **Lõi vector đang triển khai:** query AOI/hành lang, A/B/C phân tích, export có bằng chứng trên bản đồ đang dùng; kiểm dataset thật và hồi quy giao diện.
2. **Nguồn chính thức và streaming raster:** acquisition API/tệp thực có quyền; kiểm CRS/địa giới/epoch, tạo COG và viewer đọc tile đúng zoom. Nền địa hình HCMC được đăng ký đồng bộ với tất cả overlay, không chỉ uốn mặt phẳng.
3. **Ngữ nghĩa và chi tiết theo vùng:** hợp nhất source identity có review, graph công trình/bộ phận/tuyến; LOD2/3 từ nguồn có chất lượng phù hợp, 3D Tiles có ID đồng nhất và budget đo được.
4. **Cận cảnh đúng địa điểm:** ảnh nhiều góc được phép dùng, SfM/mesh hoặc 3DGS có registration; thay mặt đứng procedural ở vùng kiểm định, giữ lớp chưa biết ở nơi chưa đủ nguồn.
5. **Sa bàn quy hoạch:** chỉ ingest geometry đúng phiên bản có nguồn; timeline và so sánh với hiện trạng, chú giải trạng thái ngay trên tương tác. Phiên bản phương án thử của RtR là lớp độc lập.
6. **Phân tích chuyên ngành:** terrain profiles/đào đắp/LOS/hydrology/BIM khi đủ đầu vào và hợp đồng QC; không mở theo thứ tự “đã có nút trên UI”.

Mỗi mốc nghiệm thu bằng artifact thực và bằng chứng QA. Phần đã làm, chưa làm và đang thiếu data phải được cập nhật bằng kết quả kiểm tra, không suy từ roadmap.
