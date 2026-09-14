# C05 — chẩn đoán độc lập và kiểm tra địa hình

Kiểm tra ngày 14/09/2026, ô kỹ thuật Gia Lộc `[106.3276338,11.0830401,106.3576338,11.1130401]`. Đây không phải ranh hành chính chính thức; không suy rộng kết quả sang toàn phường hay toàn Tây Ninh.

## Vì sao một ngôi nhà vẫn nhoè

Ảnh nền đang dùng là Sentinel-2 ngày 30/11/2025, crop gốc 330×334 pixel, bước lưới 10 m. Sentinel-2 là nguồn quan sát quy mô vùng, có các băng độ phân giải 10 m; không phải ảnh hàng không cấp công trình. [ESA Sentinel-2](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2).

Tính từ 657 footprint Microsoft đã nạp: diện tích trung vị 106,21 m², tương đương 1,0621 pixel theo công thức diện tích/GSD². Có 617/657 footprint nhỏ hơn 400 m², tức chưa tới 4 pixel tương đương diện tích ở GSD 10 m. Đây là phép ước lượng mức lấy mẫu, không phải đếm chính xác các pixel giao từng đa giác. Receipt `evidence/baseline/house-image-sampling.json` lưu hash đầu vào; không dùng ảnh màn hình để suy đoán độ phân giải nguồn.

| Bước lưới ảnh giả định | Pixel tương đương diện tích mặt bằng trung vị |
|---|---:|
| 10 m — nguồn hiện tại | 1,06 |
| 4 m | 6,64 |
| 1 m | 106,21 |
| 0,5 m | 424,84 |
| 0,1 m | 10.621 |

Các hàng dưới 10 m chỉ minh hoạ toán học, không khẳng định đã có ảnh tương ứng ở Gia Lộc. Tăng kích thước texture, device pixel ratio, sharpening hoặc nội suy không tự tạo thêm quan sát mái nhà. Ảnh nhìn từ trên xuống cũng không cung cấp đầy đủ mặt đứng, phần bị che và cao độ.

Bản Batch04 đã phục hồi đường ảnh native sau sửa trước; không tiếp tục quy lỗi crop RGB hiện hành về lưới DEM109×109. Vẫn cần gate khi ảnh/UV native tải thất bại. Khối nhà hiện có footprint nhưng toàn bộ 657 chiều cao nguồn là null; các chiều cao đang hiển thị là proxy theo diện tích. Hình hộp thiếu mái và mặt đứng là giới hạn mô hình riêng, có thể cải thiện vật liệu/hình học nhưng cần gắn nhãn xấp xỉ.

## OpenTopography: có địa hình công khai, chưa có point cloud cấp nhà trong truy vấn

Truy vấn API chính thức ngày kiểm tra, `detail=true`, `include_federated=true`, đúng bbox:

`https://portal.opentopography.org/API/otCatalog?minx=106.3276338&miny=11.0830401&maxx=106.3576338&maxy=11.1130401&detail=true&include_federated=true&outputFormat=json`

Phản hồi chứa 15 dataset; cả 15 là Raster, không có PointCloud. Danh sách gồm COP30/COP90, AW3D30, NASADEM/SRTM, GEDI L3, GEDTM30 và các sản phẩm toàn cầu thô hơn. Không có DEM cấp mét hay LiDAR dày cấp nhà được tìm thấy trong phản hồi này. Không đồng nghĩa internet hoặc cơ quan nhà nước không giữ dữ liệu tốt hơn. API catalogue và API crop có yêu cầu truy cập khác nhau; không gọi miễn phí cho mọi hình thức tích hợp thương mại. [OpenTopography Developers](https://opentopography.org/developers).

## Dữ liệu mới đáng thử: GEDTM30 v1.2

Nguồn gốc COPDEM là DSM, có thể chứa cây và công trình; phóng đại cao độ 2,5× làm nhiễu nhỏ trở thành gò rõ. Cần đối chiếu ở 1× trước khi kết luận địa hình thực. GEDTM30 là DTM dự đoán bằng hợp nhất dữ liệu và machine learning, có lớp uncertainty, giấy phép CC BY4. Nó là ứng viên thử giảm ảnh hưởng vật thể trên mặt đất, không phải LiDAR đo tại Gia Lộc hoặc bằng chứng chính xác cho thiết kế thoát nước. [GEDTM30 v1.2, Zenodo](https://zenodo.org/records/18887460), [repository của tác giả](https://codeberg.org/openlandmap/GEDTM30).

Metadata Zenodo publication 06/03/2026, phiên bản v1.2.0, ghi thử nghiệm; dữ liệu gắn thời đoạn 2006–2015, không phải đo địa hình năm 2026. File trong Zenodo là 240 m; link ngoài trong description mới là COG 30 m. Crop phải chọn đúng bản 30 m và giữ uncertainty/no-data/cao độ hệ quy chiếu. Cần kiểm bằng raster thực, không coi độ phủ toàn cầu là receipt crop thành công.

## Bài Manhattan thực sự gợi ý gì

Bài gốc mô tả kết hợp footprint, đường, LiDAR và ảnh thực; dùng Blender tạo chi tiết, rồi so cùng góc camera với ảnh tham chiếu. Bài thể hiện phương pháp tạo hình và đánh giá thị giác, chưa công bố bộ kiểm chứng độ chính xác đo đạc cho Manhattan. Bài học áp dụng là bổ sung quan sát đúng công trình, hình học và quy trình kiểm ảnh; không suy ra đổi engine sẽ phục hồi ngôi nhà từ một pixel. [How to Build 3D Worlds with Astra](https://somethingbig.ai/3d-worlds).

## Receipt và fingerprint

| File trong `evidence/baseline/providers/` | SHA256 |
|---|---|
| c05-ot-openapi.json | 32d54a7631c9601306b0f505bc8f07fbd29e1e5fcb260b1cae007a6165a83058 |
| c05-ot-aoi.json | 6ed97ec10aa52cb0317ec03ade98759241e1544cf84ff7a961c9aaed1b9a7d29 |
| c05-ot-aoi.headers | 1cdfc907519c40e4ad0850a1ece1de171890d98d09e42d0e6e447e91dc136ba4 |
| c05-gedtm-zenodo.json | c430894c493e050637db1b0d1fd97b6cf433dd1196f6a268bd2b99ceba3b7805 |
| c05-gedtm-readme.md | fa53f4de617b0f22418d20a4a28478d18beb53afc4e70a3ff3d6d76465d3d583 |

Evidence spans: OpenAPI `paths./otCatalog`; catalogue `Datasets[*].Dataset.fileFormat/name` và GEDTM description; Zenodo `metadata.license`, `metadata.publication_date`, `metadata.description`, `files[*].key`; repository phần License. Capture trực tiếp API, không chỉ lấy search snippet.
