# Gia Lộc — chiến dịch C05 tìm dữ liệu và kỹ thuật nâng chất lượng 3D

RtR / City Lab · 14/09/2026 · Hồ sơ nghiên cứu và thử lấy dữ liệu trước khi có payload Hera

## Kết quả chính

**Nhà nhoè chủ yếu vì ảnh nguồn 10 m không đủ thông tin cấp công trình.** Khối nhà sơ sài còn do mô hình chỉ có footprint, chưa có mái, mặt đứng và chiều cao đo. Cần giải quyết hai việc cùng nhau: tiếp cận quan sát tốt hơn và nâng cách dựng hình có kiểm chứng. Tăng độ phân giải màn hình hoặc đổi engine không tự bổ sung quan sát.

Đợt này đã tải thực sự hai nguồn bổ sung cho đúng vùng mẫu: Google Open Buildings Temporal 2023 về hiện diện/chiều cao nhà suy luận; GEDTM30 v1.2 về địa hình dự đoán cùng lớp bất định. Chúng giúp hình khối và nền địa hình, **không phải ảnh RGB sắc hơn**. Chưa xác nhận được ảnh RGB dưới mét có thể tải và tái sử dụng miễn phí cho dự án ở vùng mẫu trong các kho đã kiểm tra. Không suy diễn kết quả này thành “không có dữ liệu tốt trên Internet”.

Đầu mối Việt Nam đáng theo tiếp nhất là danh mục chính thức của Cục Viễn thám Quốc gia: yêu cầu SPOT6 `ICR_SP_169737` cho Nam Bộ–Tây Ninh. Cần scene-level metadata và quyền khai thác để biết có dùng được tại Gia Lộc. [Báo cáo 22/BC-VTQG, 06/05/2026](https://nrsd.mae.gov.vn/noidung/Lists/ListTinTuc/Attachments/2873/Baocaocongbosieudulieuvienthamthuongxuyen_thang4.pdf).

## 1. Phạm vi và cách kiểm tra

Bbox `[106.3276338,11.0830401,106.3576338,11.1130401]`, tâm `[106.3426338,11.0980401]`, giữ nguyên vùng mẫu các batch trước. Đây là ô kỹ thuật khoảng 3,3 km mỗi chiều; chưa phải ranh hành chính chính thức. Không chuyển sang khu khác chỉ vì ở đó có dữ liệu dễ tải. Địa danh là Gia Lộc, Tây Ninh, không phải Gia Lộc ở miền Bắc. Việc hình thành phường mới từ Gia Lộc và Phước Đông có căn cứ [Nghị quyết 1682, Điều1 khoản96](https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2025/6/45138/56874-1-2025805-8061682-nq-ubtvqh15.pdf).

Ba nhánh điều tra độc lập theo Vibecode: kho ảnh quang học; nguồn cơ quan/địa phương/ảnh mặt đất; kỹ thuật dựng và chẩn đoán renderer. Contractor kiểm lại dữ liệu quan trọng và điều kiện truy cập. Lưu raw responses, hash, ngày tài liệu, ngày thu ảnh, bbox, resolution, license, trạng thái truy cập và hành động tiếp theo. Các phép thử có giới hạn dung lượng; không cào tile thương mại vào raster và không tạo chi tiết giả rồi công bố như đo thực.

“Có sản phẩm toàn cầu”, “web xem được”, “tải được”, “phủ đúng AOI” và “được dùng trong sản phẩm RtR” là năm điều kiện khác nhau. HTTP lỗi không phải kết quả tìm0; ảnh có giấy phép mở nhưng chưa định vị không được phủ lên một nhà. Báo cáo này tự chứa kết luận; các phụ lục cung cấp receipts và luận cứ kỹ thuật chi tiết.

## 2. Chẩn đoán dữ liệu và hình ảnh hiện hành

| Thành phần | Thực trạng | Giới hạn |
|---|---|---|
| Ảnh RGB | Sentinel-2 30/11/2025, crop native 330 × 334, GSD 10 m | Nhà nhỏ chỉ được lấy mẫu bằng rất ít pixel; không có chi tiết cửa, mái hoặc mặt đứng |
| Khối nhà | 657 footprint Microsoft, 657 footprint chưa có chiều cao nguồn | Chiều cao 4/6/9/12 m và extrusion đang là proxy theo diện tích, chưa có hình mái quan sát |
| Địa hình | COPDEM DSM 109 × 109 khoảng 30 m, phóng đứng 2,5× | DSM có thể chứa cây/công trình; phóng đứng làm gò và lỗi nền dễ thấy hơn |
| Cây | Raster chiều cao tán mô hình, đã bỏ cone theo ô lưới | Không có vị trí thân/loài/cây cá thể; không thể coi các pixel là cây thật |
| Nhà đặt trên nền | Một base cao độ lấy tại trung bình đỉnh footprint | Nền phẳng có thể nổi/lún tại góc trên mesh địa hình; cần kiểm từng đỉnh và raycast |

Tính độc lập từ footprint: diện tích trung vị 106,21 m², tương đương 1,0621 pixel diện tích ở 10 m; 617/657 footprint nhỏ hơn 4 pixel diện tích. Đây là diện tích/GSD², không phải đếm giao cắt pixel. Vì vậy một nhà vẫn nhoè sau phục hồi ảnh native là điều có thể dự đoán từ dữ liệu, không phải bằng chứng màn hình đang render ở chất lượng thấp. [ESA về Sentinel-2](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2).

Kiểm source cũng cho thấy relief DSM 24,145 m được thể hiện thành khoảng 60,36 m ở 2,5×. Chẩn đoán mô hình dự báo 776/3.103 đỉnh nhà chênh base–DSM hơn 1 m; đây là chênh nội bộ renderer trên raster, không phải sai số khảo sát thực địa. Đợt này chưa thay renderer. Các kiểm raycast và A/B 1× cần làm ở phase thể hiện tiếp theo.

## 3. Nguồn mới đã thu được

| Dữ liệu | Tệp thực và lấy mẫu | Có thể làm | Điều chưa chứng minh |
|---|---|---|---|
| Google Open Buildings Temporal 2023 | GeoTIFF 823 × 833, grid xuất 4 m,3 band presence/count/height, EPSG:32648 | Thêm bằng chứng mô hình về hiện diện và chiều cao; so với proxy diện tích hiện tại | Không phải ảnh màu, chiều cao đo hoặc căn cứ địa chính từng nhà |
| GEDTM30 v1.2 | Hai GeoTIFF 109 × 109 DTM và RF spread, grid 1 arc-second, EPSG:4326, metadata datum EGM2008 | A/B nền dự đoán với COPDEM DSM; xem bất định theo vị trí | Không phải LiDAR trần tại Gia Lộc hay dữ liệu thiết kế thoát nước đã nghiệm thu |

Google công bố effective resolution khoảng 4 m dù file nguồn lưu ở grid 0,5 m; data được cấp theo CC BY 4 hoặc ODbL. Chiều cao phải đi cùng presence mask; confidence không được diễn giải như xác suất đã hiệu chuẩn. Không dùng MAE công bố ở khu đánh giá khác làm sai số Gia Lộc. [Dataset và điều kiện Google](https://sites.research.google/gr/open-buildings/temporal/).

Crop Google có 685.559 pixel hợp lệ; thử mask presence > 0,5 thu 40.423 pixel, chiều cao mô hình trung bình khoảng 5,47 m, max 17,84 m. Ngưỡng này là phép thăm dò, chưa hiệu chuẩn cho địa phương; không biến các pixel thành số nhà hoặc thay 657 chiều cao chưa có bằng trường “đã đo”.

DTM mới có 11.881 pixel hợp lệ, cao độ 3,8–25,7 m; RF spread 0,17–4,42 m. Spread là bất định mô hình, không phải sai số thực địa được bảo đảm. Đã lấy dữ liệu bằng Range trong vùng nhỏ; không tải raster toàn cầu. File Zenodo 240 m không bị nhầm với COG ngoài 30 m. Release ghi dùng thử; thời đoạn dữ liệu 2006–2015 khác ngày phát hành 2026. [GEDTM30 release](https://zenodo.org/records/18887460).

Cả hai nguồn mới được giữ thành dữ liệu nghiên cứu có lineage, chưa gắn vào map hiện hành. Trước hợp nhất cần co-registration, datum/epoch, mask và QA footprint để tránh trình diễn hình khối có vẻ đúng nhưng lệch nguồn.

Đã thu thêm một ảnh gốc cửa hàng mang biển địa chỉ Gia Lộc: 3.024 × 3.481 pixel, tác giả Phương Huy, CC BY-SA 4.0, EXIF ngày 17/09/2022. Ảnh cho thấy chi tiết mái hiên và vật liệu ở cự ly gần, nhưng thiếu GPS và chưa đối chiếu được footprint. Giữ trong thư viện tham chiếu, chưa gắn lên map; không coi độ sắc của ảnh này là chứng minh có ảnh đủ cho cả vùng. [Trang ảnh và giấy phép Commons](https://commons.wikimedia.org/wiki/File:T%C3%A2y_Ninh_2022_(bi%E1%BB%83n_hi%E1%BB%87u_c%E1%BB%ADa_h%C3%A0ng_%E1%BB%9F_p_Gia_L%E1%BB%99c,_Tx_Tr%E1%BA%A3ng_B%C3%A0ng).jpg).

## 4. Ảnh tốt hơn: kết quả tìm kiếm và đường tiếp cận

| Nhóm nguồn | Kết quả hiện tại | Quyết định |
|---|---|---|
| OpenAerialMap/HOTOSM | Exact AOI và envelope rộng không có OAM imagery items | Giữ receipts; chưa có ảnh hàng không mở để tải từ các truy vấn này |
| Cục/Đài Viễn thám Quốc gia | PDF chính thức SPOT6 có yêu cầu Tây Ninh 169737 | Ưu tiên hỏi catalogue scene giao bbox và quyền khai thác |
| Cổng Tây Ninh/Gia Lộc, VNPT quy hoạch, DOSM/VNSDI, TEDI | Có đầu mối; tệp/chức năng đã kiểm không chứng minh raster/mesh đủ điều kiện | Xin metadata và file nguồn đúng chủ quản; không dùng screenshot quy hoạch làm ảnh hiện trạng |
| Planet/NICFI/Tropical Forest Observatory | Mosaics khoảng 4,77 m; chương trình/quyền truy cập đã thay đổi, có ràng buộc mục đích | Không coi là nguồn RGB miễn phí sẵn dùng cho doanh nghiệp hoặc hoạt động chính quyền |
| Maxar/Airbus | Có sản phẩm dưới mét; chưa xác nhận free AOI asset hoặc quyền tải | Tìm catalogue có tài khoản hoặc hợp tác dữ liệu; không đặt mua trong C05 |
| Copernicus VHR | Quyền truy cập phụ thuộc nhóm người dùng đủ điều kiện | Chưa được coi là ảnh mở có thể tải cho dự án |
| Google/Esri/Bing | Có basemap để tham chiếu; quyền export/tái dùng khác quyền xem | Chỉ khai thác đúng license/API; chưa nhận tile làm data của RtR |
| Commons/Mapillary/KartaView | Ảnh ứng viên hoặc các phép kiểm bị giới hạn; chưa có bộ ảnh đủ để gắn công trình | Xác minh địa chỉ/hướng mặt đứng/rights; nguồn chưa định vị giữ ngoài map |
| OpenTopography | Exact bbox trả 15 globalRaster, 0 PointCloud | Có nền địa hình, chưa có cloud dày cấp nhà trong kết quả này |

NRSD row 13 ghi 3 cảnh tổng, 1 cảnh dưới 25% mây; khoảng 1/4–31/5/2026 là **thời gian đặt chụp**, không phải ngày thu. Không có scene footprint để xác nhận giao ô. SPOT6 PAN danh định 1,5 m khác MS 6 m và sản phẩm pansharpened; ảnh này nếu có phù hợp sẽ giúp bối cảnh mái/đường hơn Sentinel, vẫn chưa thay ảnh mặt đứng gần. [Báo cáo NRSD, phụ lục2 trang9](https://nrsd.mae.gov.vn/noidung/Lists/ListTinTuc/Attachments/2873/Baocaocongbosieudulieuvienthamthuongxuyen_thang4.pdf).

NICFI cũ hết kỳ hợp đồng 23/01/2025. TFO hiện công bố license phi thương mại phục vụ rừng; operational government/business có đường license riêng. Chưa kiểm được scene Gia Lộc dưới tài khoản đủ điều kiện. [Thông báo NICFI](https://www.nicfi.no/2025/01/28/nicfi-satellite-data-program-enters-new-phase/), [Planet TFO hiện hành](https://account.planet.com/tropical-forest-observatory/).

## 5. Kỹ thuật tốt hơn khi chưa có ảnh cấp nhà

**Nâng thị giác ngay bằng hình học và vật liệu:** kiểm texture native/fallback; đưa địa hình 1× về chế độ đọc dữ liệu; sửa foundation và phân cấp chi tiết theo khoảng nhìn. Footprint có thể dựng mái/eave/ridge, vật liệu tôn/ngói/bê tông PBR và cây mô phỏng trong một mode có nhãn. Mái/cửa/loài cây không có chứng cứ vẫn giữ thuộc tính observed = chưa có. Đây là dựng hình xấp xỉ để dễ nhìn, không tuyên bố từng nhà có hình thức đúng thực.

**Nâng độ giống từng công trình bằng ảnh đúng địa điểm:** rectification một mặt phẳng để phủ mặt đứng, review footprintID/hướng mặt/địa chỉ, giữ phần chưa thấy trung tính. Nhiều ảnh overlap hoặc video được cấp quyền có thể làm SfM/MVS texturedmesh bằng COLMAP/ODM. Có thể bắt đầu bằng ảnh mặt đất mà không chờ drone; chưa đủ dữ liệu thì chưa cam kết mesh kín. Controls và checkpoints độc lập cần thiết nếu muốn đo theo mét.

**Dùng 3D Gaussian Splatting cho cụm trọng điểm:** ảnh đa góc+camera poses mới là input. Spark/SuperSplat là công cụ hiển thị/chỉnh cảnh, không tạo quan sát. Splat có thể rất chân thực tại vùng camera được phủ nhưng không mặc nhiên cho mesh kín/collision/đo đạc. License implementation và imagery phải kiểm riêng; originalInria có điều kiện phi thương mại. [COLMAP](https://colmap.github.io/tutorial.html), [ODM](https://docs.opendronemap.org/gcp/), [gsplat](https://github.com/nerfstudio-project/gsplat), [Spark](https://github.com/sparkjsdev/spark).

**Super-resolution chỉ là nhánh nghiên cứu có nhãn:** multiframe khai thác nhiều quan sát và registration; diffusion bổ sung chi tiết theo mô hình. Hai ngày ảnh cách một năm không phải burst ổn định. Cần raw RGB/NIR/SCL, masks và HR holdout khi có; không dùng SR để kết luận số cửa, ranh nhà hoặc “GSD1cm”. [ESA OpenSR](https://github.com/ESAOpenSR/opensr-model), [OpenSR-test](https://github.com/ESAOpenSR/opensr-test).

**Streaming/LOD khi mở rộng:** giữ Three ở pilot; cân nhắc Cesium/3DTiles khi phạm vi và số asset tăng. Đây là tổ chức và hiển thị dữ liệu, không tự cải thiện GSD hay accuracy. [OGC 3D Tiles1.1](https://docs.ogc.org/cs/22-025r4/22-025r4.html).

## 6. Lộ trình ưu tiên trước Hera

| Bước | Đầu ra cụ thể | Cổng chấp nhận |
|---|---|---|
| P05A — nền và tỷ lệ | A/B terrain 1×; native-load gate; foundation vertex QA; camera LOD theo GSD | Cùng camera; ảnh gốc giữ nguyên; lỗi nổi/lún có receipt và không nhầm với accuracy thực địa |
| P05B — hình khối dựa dữ liệu | Đối chiếu Google height với footprint, thử GEDTM kèm spread | Giữ source/date/model flags; không tự gán height measured; datum/grid/mask đã kiểm |
| P05C — khu trình diễn chi tiết | Pilot mái vàPBR trênfootprint; mode mô phỏng có nhãn; câythematic khác câyđồhoạ | Hình học không xuyênpolygon; genericdetail không giả làm fact; desktop/mobile/framebudget đo thực |
| P05D — ảnh thật trọng điểm | Bộ ảnh đã xác minh địa chỉ; mặt đứng matched; optionalSfM/MVS/3DGSpilot | Rights, date, camera/coverage; không ảnh nhầm nhà; visualreview vàaccuracyreview riêng |
| P05E — hợp tác khai thác dữ liệu | Hồ sơ nhu cầu cho NRSD và chủ quản địa phương | Scene-level bbox/date/GSD/cloud/license được xác nhận trước nhận data đủ điều kiện |

Các bướcA–C có thể triển khai với dữ liệu hiện có và mới thu; D phụ thuộc quan sát đúng công trình, E phụ thuộc đơn vị nắm dữ liệu. Không lấy dự báo nỗ lực lập trình làm lịch đã được bên ngoài cam kết. Chưa gửi yêu cầu, ký EULA hoặc mua ảnh.

Khi đề nghị dữ liệu, gửi bbox + polygon nhu cầu và yêu cầu tối thiểu: scene ID/footprint, ngày thu, native PAN/MS và độ phân giải sản phẩm xuất, mây trong AOI/off-nadir, CRS/datum, mức orthorectification và accuracy report nếu có, quyền display/transform/export/redistribution và phí. Cơ quan tỉnh cần xác nhận ranh số, ảnh ortho, footprints, DSM/DTM, cao độ mái/mesh/cloud nếu đang giữ. Không khẳng định trước họ có đủ tất cả.

## 7. Ý nghĩa với TP.HCM và sa bàn quy hoạch

Có thể tái dùng pipeline registry, tọa độ, LOD, mái/PBR, ảnh mặt đứng vàmesh/splats. Dữ liệu Gia Lộc không thay cho dữ liệu TP.HCM; cùng tên sản phẩm hoặc phạm vi toàn cầu cũng cần crop/QA riêng. Sa bàn quy hoạch phải tách hiện trạng theo nguồn/ngày khỏi đồ án đã phê duyệt theo mốc. Nghiên cứu C05 không tạo công trình tương lai và không thêm dữ liệu UAV.

Bài Manhattan giúp ở quy trình dữ liệu phong phú, tạo asset và review cùng góc ảnh; chưa phải chứng nhận độ chính xác. Muốn vừa đẹp vừa nghiêm túc cho lãnh đạo, ưu tiên vài cụm có ảnh đúng chỗ để thấy chất lượng thật, cùng nền toàn vùng có disclosure gọn. GSD1cm, cây cá thể, cao độ mái đo vàđịachính chưa được đáp ứng bằng nguồn hiện tại. [Bài phương pháp gốc](https://somethingbig.ai/3d-worlds).

## Phụ lục và khả năng tái kiểm

- `research/baseline.md`: chẩn đoán độc lập và OpenTopography.
- `research/optical.md`, `optical-sources.json`: kho ảnh, license, actual query và crop Google.
- `research/local.md`, `local-sources.json`: địa phương, danh mụcNRSD, ảnh ứng viên và đường tiếp cận.
- `research/techniques.md`, `technique-sources.json`:12phươngpháp, input/compute/license/giới hạn và roadmap.
- `evidence/`: raw snapshots/range receipts, crops,metadata,sourceaudit vàSHA256.
- `governance/`: TIP/Completion vàVerify củaContractor.

Chấp nhận đợt này theo nghiên cứu có bằng chứng và boundeddataacquisition; không lấy việc báo cáo/tệp hợp lệ làm nghiệm thu ảnh chân thực, dữ liệu LiDAR hoặc độ chính xác khảo sát củaphường.
