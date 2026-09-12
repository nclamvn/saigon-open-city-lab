# TP.HCM Open City Lab — PoC 12

Ngày thực hiện: 10/09/2026. Phạm vi: khu trung tâm ven sông Sài Gòn, Thủ Thiêm và một phần Bình Thạnh; **38,57 km²**, không phải toàn bộ địa giới TP.HCM.

## Kết quả có thể sử dụng ngay

- Mô hình tương tác: mở `SAIGON-3D.html` bằng trình duyệt hỗ trợ WebGL. Hình học, ảnh nền và engine được nhúng trong một file; font có fallback khi mất mạng.
- Bản làm việc: `hcmc-poc/index.html`, có 18 góc nhìn, xoay/zoom/pan, ánh sáng chiều, xem nguồn chiều cao, các lớp Reality Patch, texture atlas, chi tiết đô thị, Confidence Map, Cinematic Night, chọn đối tượng và lưu ảnh.
- Kho 21 đầu mối nguồn dữ liệu/công cụ: `hcmc-poc/research/source-catalog.csv` và JSON.
- 26 nhận định có bằng chứng từ 18 thực thể nguồn/công cụ, cùng snapshots, checksum và bộ kiểm Refinery. Các đầu mối còn lại được đánh dấu thăm dò, chưa nâng thành dữ kiện đã kiểm chứng.
- Dữ liệu gốc OpenStreetMap, Overture, ảnh nền EOX, tile DEM mẫu, câu truy vấn và mã tái lập được giữ trong gói bàn giao.

**Mức đạt được:** hình thái đô thị 3D có dữ liệu địa lý thật, được bổ sung hình khối gần đúng, mặt đứng tổng hợp và ánh sáng. **Chưa đạt:** tái dựng photorealistic cận cảnh bằng ảnh đa góc, mô hình đo đạc, hay bản sao số có thể dùng điều hướng UAV. Chất lượng cần đánh giá qua cảnh 3D thực tế, không đồng nhất với mức kiểm định của dữ liệu.

PoC 12 tổ chức lại toàn bộ lớp chữ theo hướng map-first: ba nút nhỏ mở các ngăn loại trừ lẫn nhau, HUD có thể thu gọn và bố cục dọc có vùng cuộn riêng. View 18 bổ sung blue hour, bloom nhiều tầng, color grade, 220 vệt đèn, 116 điểm sáng skyline, đường ẩm thủ tục và Camera Director 45 giây. Các hiệu ứng này được phân loại là trình diễn, không phải điều kiện hiện trường quan sát được.

## 1. Những phép thử đã chạy

| Nguồn | Phép thử | Kết quả | Sử dụng trong cảnh |
|---|---|---|---|
| OpenStreetMap / Overpass | Truy vấn bbox 106.684,10.750,106.739,10.808 | 23.309 đối tượng; 10.411 công trình/bộ phận công trình trước lọc | Có |
| Overture | Tải cùng bbox qua Python client | 70.699 đối tượng, release 2026-08-19.0 | Thêm 60.392 khối |
| Overture thử nghiệm nhỏ | Bbox 106.698,10.768,106.710,10.782 | 2.097 đối tượng; 44 có height, 155 có num_floors | Đã dùng để đánh giá trước khi tải vùng lớn |
| EOX 2016 | WMS GetMap, ảnh 2048 × 2048 | Tải thành công; CC BY 4.0 | Có, nền lịch sử |
| Mapzen Terrain | Tải 1 tile Terrarium | Tải thành công | Chưa tích hợp, chưa phủ hết bbox |
| OpenAerialMap | Metadata API theo bbox PoC | 0 kết quả trong phản hồi đã lưu | Không |
| GITC/HCMGIS | Tải trang đầu mối | Lỗi xác thực chứng chỉ trong lần tải trực tiếp | Chưa có dữ liệu |
| HCMC Geoportal | Tải trang công khai | Chỉ thu được vỏ trang, chưa xác nhận dữ liệu 3D truy cập tự do | Không |

Overpass chính đã timeout; endpoint Kumi trả dữ liệu thành công nhưng snapshot cơ sở là **31/05/2026**, không phải ngày tải 10/09/2026. Ngày tải, ngày release và ngày quan sát thực địa là ba trường khác nhau. Các mốc này không được đánh đồng.

Overture có thể cung cấp nhiều footprint hơn OSM trong vùng này, nhưng chưa giải quyết được thiếu chiều cao: trong toàn bộ bản tải về chỉ có 170 đối tượng có height và 661 có num_floors. Đây là phép đếm trên file đã tải, không phải tuyên bố về toàn bộ dữ liệu Overture trên thế giới. [Overture Python client](https://docs.overturemaps.org/getting-data/overturemaps-py/)

## 2. Quy trình dựng và quy tắc gần đúng

1. **Giữ nguyên nguồn:** lưu JSON/GeoJSON gốc, truy vấn, release, dấu thời gian, SHA-256. Không dùng file render làm nguồn sự thật.
2. **Chuẩn hóa hình học:** sửa polygon không hợp lệ khi có thể; cắt theo bbox; ghép outer/inner rings của sông. Chuyển sang hệ tọa độ cục bộ theo mét với phép chiếu gần đúng cho vùng nhỏ.
3. **Hợp nhất footprint:** giữ OSM trước. Loại ứng viên Overture nếu tổng diện tích giao với các khối OSM lớn hơn 10% diện tích ứng viên; bỏ mảnh dưới 8 m². Đây là heuristic chống chồng khối, chưa phải đối sánh định danh công trình đã kiểm chứng. Giữ GERS và nguồn từng bản ghi Overture.
4. **Dựng chiều cao:** dùng height nếu có; nếu không, lấy số tầng × 3,2 m; nếu vẫn thiếu, dùng nhóm diện tích mặt bằng: dưới 55 m² → 7,5 m; dưới 180 m² → 12 m; dưới 700 m² → 17 m; còn lại → 24 m. Với OSM có dao động tất định ±1,3 m để giảm lặp hình. Đây là giả định hình thái, không phải kết quả đo.
5. **Xử lý đế và bộ phận:** hạ footprint mẹ thành đế tối đa 9 m khi có bộ phận được vẽ riêng che phủ đáng kể, tránh nhân đôi tháp. Quy tắc này cũng là gần đúng.
6. **Tinh chỉnh điểm nhấn:** bó tháp Landmark 81 được minh họa theo ảnh tham chiếu và chiều cao tổng thể trong nguồn; các kích thước bó tháp là giả định. Mái nghiêng Bitexco đọc thông tin mái OSM; sân đáp là chi tiết minh họa. Không quảng bá các chi tiết này là hình học đo đạc.
7. **Vật liệu và ánh sáng:** mặt đứng kính/cửa sổ theo quy tắc, atlas 8 họ vật liệu, 600 thiết bị mái ứng viên, 240 dải hiệu trừu tượng, cây, nước và ánh sáng tổng hợp. Các lớp PoC 08–10 được ghi rõ là mô phỏng; không dùng ảnh bản đồ làm texture hay giả dữ liệu khảo sát.
8. **Kiểm tra trực quan:** mở cảnh trong trình duyệt, xem các góc, chọn công trình và kiểm tra bảng nguồn; xuất ảnh từ chính WebGL canvas.

## 3. Chất lượng hiện tại

Tổng cộng **70.719 khối dựng**, bao gồm bộ phận công trình và các khối minh họa, không được hiểu là 70.719 tòa nhà độc lập đã xác nhận.

| Cách xác định chiều cao | Số khối | Tỷ lệ |
|---|---:|---:|
| Có height trong nguồn | 191 | 0.27% |
| Suy từ số tầng | 448 | 0.63% |
| Ước lượng, gồm tinh chỉnh Landmark 81 | 70.017 | 99.01% |
| Đế công trình gần đúng | 63 | 0.09% |

**Khoảng 99.1% chiều cao đang là giả định hình thái.** Việc cảnh có nhiều nhà hơn không có nghĩa chiều cao chính xác hơn. Chế độ “Nguồn chiều cao” làm khoảng trống này nhìn thấy được.

Các giới hạn khác: mặt đất phẳng quy ước, chưa có chuyển đổi cao độ/geoid; ảnh EOX là mosaic 2016/2017 nên không phải hiện trạng 2026; chưa mô hình dây điện, anten, cẩu xây dựng hay vật cản động. Footprint phát hiện bằng ML có thể sai, dính nhà hoặc lệch ảnh. Số đường là số đoạn geometry chứ không phải số tuyến đường độc lập. Độ chính xác hình học và chiều cao của PoC tại TP.HCM **chưa được đo kiểm**.

## 4. Nguồn free nào đáng đầu tư tiếp?

- **Overture + OSM:** đã chứng minh tải và dựng được. Ưu tiên hoàn thiện đối sánh, truy nguồn và loại dị thường; không chỉ tăng số khối. [Giấy phép Overture](https://registry.opendata.aws/overture/), [OSM](https://www.openstreetmap.org/copyright).
- **Google Open Buildings 2.5D:** có phủ Việt Nam; có thể tải từ GCS, không bắt buộc dùng Earth Engine. Chiều cao dự đoán bị chặn ở 100 m và độ phân giải hiệu dụng khoảng 4 m. Chưa chạy phép lấy mẫu raster trong đợt này; cần mask building presence và kiểm tra chệch vị trí trước khi ghép. Không áp sai số công bố ở khu vực khác thành sai số TP.HCM. [Tài liệu và giới hạn](https://sites.research.google/gr/open-buildings/temporal/).
- **Copernicus Sentinel:** phù hợp cập nhật bối cảnh và phát hiện thay đổi diện rộng; không đủ chi tiết mặt đứng để thành ảnh chụp 3D sát nhà. Dữ liệu mở và quota dịch vụ phải xét riêng. [Data Space](https://dataspace.copernicus.eu/about).
- **EOX:** bản 2016 CC BY 4.0 đã dùng được. Các bản 2018–2025 miễn phí theo CC BY-NC-SA, không đưa vào nhánh doanh nghiệp mặc định. [Điều kiện nguồn](https://cloudless.eox.at/license-non-commercial).
- **OpenAerialMap:** đã thử và chưa có kết quả trong bbox. Tiếp tục chỉ khi có vùng khác hoặc nguồn mới, không coi đây là kho chắc chắn có ảnh TP.HCM.
- **Ảnh UAV do doanh nghiệp tự có:** tuyến ngắn nhất để tiến tới chân thực cận cảnh. Không phải dữ liệu Internet miễn phí, nhưng có thể tận dụng tư liệu sẵn có mà không mua dữ liệu ngoài.

## 5. Ba nhánh để nâng từ PoC lên cảnh chân thực

**Nhánh A — hình học đô thị tốt hơn, tiếp tục dùng nguồn mở.** Tải thử raster chiều cao Google cho một ô nhỏ; đối chiếu với các mốc độc lập; ghép nền DEM đủ bbox; tách dữ liệu đã đo/nguồn cộng đồng/ML/giả định. Kết quả cần đạt: có báo cáo độ đầy đủ và nguồn cho từng đối tượng, không chỉ một render đẹp.

**Nhánh B — một cụm 100–300 m chân thực bằng ảnh.** Chọn cụm có bộ ảnh nhiều góc cùng thời điểm, có quyền sử dụng. Chạy COLMAP để xác định camera; dùng ODM hoặc ODX để tạo mesh và texture. Chọn ảnh kiểm tra không tham gia dựng để đánh giá khả năng tái hiện; nếu cần đo đạc, bổ sung điểm khống chế và điểm kiểm tra độc lập. [COLMAP](https://colmap.github.io/), [ODM](https://www.opendronemap.org/odm/), [WebODM](https://webodm.org/).

**Nhánh C — Gaussian Splatting cho cận cảnh.** Dùng ảnh và camera pose đủ chất lượng để huấn luyện; ghép cảnh cục bộ vào mô hình thành phố. gsplat có giấy phép Apache 2.0; vẫn cần phần cứng và dữ liệu phù hợp. Splat dùng để quan sát, không tự thay thế hình học vật cản đã kiểm định. [gsplat](https://github.com/nerfstudio-project/gsplat).

Khi dữ liệu tăng, dùng 3D Tiles/Cesium để tải theo vùng và mức chi tiết, thay vì nhúng toàn thành phố trong một file lớn. Cần phân biệt CesiumJS mã nguồn mở với dịch vụ ion có điều kiện riêng. [Cesium 3D tiling](https://cesium.com/learn/3d-tiling/).

## 6. Chiến dịch đã khởi động và các việc còn mở

| Ưu tiên | Việc | Tiêu chí kết thúc |
|---|---|---|
| Đã làm | Tải OSM + Overture và dựng cảnh | Dữ liệu gốc, mô hình xem được, quy tắc gần đúng công khai |
| Đã làm | Lọc nguồn free | Danh mục, snapshots, claims và bộ kiểm nguồn |
| P0 | Kiểm tra chiều cao Google 2.5D trên ô nhỏ | Có raster thực, thống kê mẫu và sai khác; không chỉ đọc tài liệu |
| P0 | Cải thiện hợp nhất footprint | Kiểm tra mẫu các trường hợp trùng/tách/dính nhà, báo tỷ lệ sai |
| P1 | Ghép DEM và hệ cao độ | Đủ vùng, khai báo vertical datum, không phóng đại cao độ ngầm |
| P1 | Tìm bộ ảnh hợp lệ cho một cụm | Có ảnh nhiều góc, quyền sử dụng, vị trí và thời điểm |
| P1 | Dựng mesh/3DGS cận cảnh | Chạy được quy trình, kiểm tra góc nhìn giữ lại và ảnh render |
| P2 | Kiểm kê dữ liệu địa phương | Xác nhận từ chủ nguồn về quyền tải, độ phủ, cập nhật, định dạng |
| P2 | Phân mảnh và cập nhật | Thay được từng ô dữ liệu, không phải dựng lại toàn bộ |

Đây là backlog đã lưu để tiếp tục; **chưa có lịch tự động chạy nền**. Chưa gửi thư, đăng ký tài khoản, mua dữ liệu hoặc làm việc thay doanh nghiệp với bất kỳ cơ quan nào.

## 7. Tái lập và kiểm tra

Xem `hcmc-poc/README.md`. Dữ liệu đã tải có thể dựng lại mà không gọi nguồn mạng. Để giữ provenance, tạo bản sao dự án trước khi chạy các script tải mới. `research/refinery.py` build registry tất định và kiểm lại từ claims; `bites.py` đã chứng minh 5 cổng áp dụng bắt được lỗi giả, các cổng không áp dụng được ghi N/A.

Các số liệu đầu vào và quy tắc nằm ở `data/quality-report.json`; kết quả mẫu Overture ở `data/overture-quality.json`; hash bàn giao nằm trong `delivery-manifest.json`. Kiểm tra nguồn chứng minh khả năng truy nguyên; không chứng minh các dữ liệu địa lý đó đã đúng ngoài thực địa.
