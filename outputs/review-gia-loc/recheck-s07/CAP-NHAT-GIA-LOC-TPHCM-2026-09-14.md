# Cập nhật đối chiếu Gia Lộc và City Lab TP.HCM

Ngày kiểm tra: **14/09/2026**. Phạm vi: tìm nguồn bổ sung trên Internet và đọc lại dữ liệu/mã hiện hành của hai PoC. Không nạp dữ liệu mới vào ứng dụng, không thay code sản phẩm, không thực hiện khảo sát.

**Kết luận:** TP.HCM có lợi thế rõ về ảnh đúng công trình và đầu mối dữ liệu quản lý đô thị. Lợi thế này giúp nâng chất lượng thị giác và khả năng nối quy hoạch/hồ sơ. Các nguồn raster toàn cầu không mặc nhiên có độ phân giải tốt hơn ở TP.HCM. Chưa xác minh được một gói miễn phí, có quyền sử dụng, gồm orthophoto 1 cm và point cloud/DTM khảo sát mới cho đúng khu mẫu của một trong hai dự án.

## 1. Phát hiện bổ sung có thể thay đổi cách triển khai

**Dữ liệu quy hoạch có đầu mối cụ thể hơn.** Bài công bố ngày 19/08/2026 của Khu Công nghệ cao nêu danh mục 142 tập dữ liệu. Trong PDF kèm theo, mục **105** mô tả GIS quy hoạch phân khu 1/2.000: ranh đồ án, chức năng đất/chỉ tiêu kiến trúc, tim đường/lộ giới và giao thông dạng vùng; có định dạng API, đầu mối hệ thống GIS Xây dựng. Đây là cơ sở để tìm dữ liệu cho phép đối chiếu hiện trạng–quy hoạch và phân tích tác động. Danh mục không chứng minh mọi API đang tải được, toàn bộ dữ liệu đã đầy đủ hay đã được RtR nhập. [Bài công bố](https://shtp.hochiminhcity.gov.vn/danh-muc-du-lieu-mo-cua-thanh-pho-ho-chi-minh-962.htm), [PDF danh mục, trang PDF 44–45](https://shtp.hochiminhcity.gov.vn/Portals/0/UserFiles/63/2026_DANH_MUC_MO.pdf).

**Có dữ liệu LiDAR từng được thu thập và sử dụng ở TP.HCM.** Báo cáo nghiên cứu ngập đăng trên hệ thống Trung tâm Quản lý hạ tầng kỹ thuật mô tả đợt bay LiDAR năm **2012**, cùng sản phẩm địa hình lưới **5 × 5 m** lấy từ Trung tâm GIS. Điểm này nâng đánh giá từ “chưa tìm thấy trong PoC” sang “có bằng chứng dữ liệu đã tồn tại ở cơ quan”. Lưới 5 m trong báo cáo không phải mật độ point cloud hay GSD ảnh; cũng chưa chứng minh raw LAS/LAZ đang mở, còn đầy đủ, đúng hệ cao hoặc đủ mới cho trung tâm thành phố hiện nay. [Báo cáo, trang PDF 78–79 / trang nội dung 49–50](https://ttqlhtkt.hochiminhcity.gov.vn/documents/20197/31303/1.%2BBCTongHop_KSatvaDanhGiaThietHaiNgapLut.pdf/b72d3dc7-101c-461b-a888-cfc7ba42427c).

**Các hồ sơ chuyên ngành là tài sản cần kết nối.** Bài của Sở KH&CN ngày 11/08/2025 mô tả HCMGIS quản lý hơn 80 lớp ở các lĩnh vực hạ tầng, số nhà, giao thông, dịch vụ, tài nguyên và quy hoạch, có metadata và phân quyền. Đây là đầu mối tìm/chia sẻ nguồn; không công nhận toàn bộ kho là dữ liệu miễn phí tải không điều kiện. [Sở KH&CN](https://dost.hochiminhcity.gov.vn/tin-tuc-khcn/tphcm-xay-dung-he-thong-metadata-cho-kho-du-lieu-thong-tin-di-ly/).

**Tầm nhìn 100 năm có bối cảnh chính thức, chưa thành hình học đã duyệt trong PoC.** Tin HĐND ngày 09/09/2026 nói đồ án đang được hoàn thiện. Không suy từ tin hoạt động ra bản vẽ hay hình khối tương lai được phê duyệt. [HĐND TP.HCM](https://hdnd.hochiminhcity.gov.vn/tin-tuc/ban-do-thi/ban-do-thi-hdnd-thanh-pho-khao-sat-cong-tac-lap-quy-hoach-tong-thethanh-pho-ho-chi-minh-tam-nhin-100-nam).

## 2. Nhiều dữ liệu hơn ở những phần nào?

| Nhóm | Gia Lộc đang có | TP.HCM đang có/lợi thế | Mức được công nhận |
|---|---|---|---|
| Footprint/khối nhà | 657 footprint trong AOI kỹ thuật | 70.719 khối trong 38,57 km² trung tâm, gồm bộ phận nhà | Đã ở ứng dụng; khác phạm vi nên không dùng tỷ lệ số lượng để kết luận độ chính xác |
| Ảnh đúng công trình | 20 mục tiêu, 0 ảnh mặt đứng xác minh | 20 hồ sơ ảnh đúng công trình; 15 đủ điều kiện pipeline, 5 giữ lại cần tách mặt | TP.HCM có lợi thế thị giác thực; chưa phải tái dựng toàn công trình hay hiện trạng đồng nhất một ngày |
| Địa hình | GEDTM dự đoán/COPDEM DSM lớp 30 m đã gắn cảnh | City Lab nền vẫn phẳng; có đầu mối LiDAR 2012/địa hình 5 m tại cơ quan | Gia Lộc có kết quả địa hình hiện hành hơn; nguồn LiDAR TP.HCM mới là đầu mối chưa thu nhận |
| Chiều cao nhà | 482 nhà đủ hỗ trợ mô hình Google; phần còn lại proxy; chiều cao đo vẫn thiếu | Bộ nền 70.017 khối ở nhóm ước lượng; có thử raster Google ở pipeline nghiên cứu | Đều thiếu đo kiểm; thẻ height hay mô hình không được coi là surveyed |
| Cây và mặt nước | ETH tán cây, WorldCover, JRC/OSM và cây mô phỏng | Cây/river render phong phú; các bộ raster toàn cầu có thể khai thác cho AOI TP.HCM | Nguồn raster là lớp bối cảnh, không phải kiểm kê từng cây hoặc mô hình ngập |
| Đa thời gian | Hai Sentinel cùng lưới 10 m và JRC dài hạn | City Lab chưa có quy trình biến động đối tượng/địa hình nhiều kỳ | Năng lực Gia Lộc tốt hơn ở mức dữ liệu raster, chưa nhà mới/as-built |
| Quy hoạch/hồ sơ | Chưa có lớp chuyên ngành chính thức nhập vào PoC | Danh mục API quy hoạch, cổng GIS, kho HCMGIS và các đầu mối hồ sơ | TP.HCM có đường tiếp cận rõ hơn; cả hai ứng dụng vẫn thiếu tích hợp nghiệp vụ |
| Orthophoto 1 cm / LiDAR khảo sát mới | Chưa có gói đã xác minh đúng AOI | Chưa có gói miễn phí đã xác minh đúng khu mẫu | Chưa đạt ở cả hai; không kết luận Internet hoàn toàn không có |

Ví dụ ảnh có giấy phép và địa điểm mô tả cụ thể: [ảnh UBND TP.HCM nhìn từ Nguyễn Huệ](https://commons.wikimedia.org/wiki/File:Peoples%27_Committee_building_at_the_far_end_of_Nguyen_Hue_walking_street_(32015783691).jpg). [Danh mục ảnh Nguyễn Huệ](https://commons.wikimedia.org/wiki/Category:Nguyen_Hue_Boulevard,_Ho_Chi_Minh_City) có nhiều góc/công trình để tiếp tục lọc. Phải xem quyền, ngày và khả năng tách mặt của từng ảnh; không dùng giấy phép trang category thay giấy phép tệp.

Các số PoC trên đối chiếu trực tiếp từ [scene TP.HCM](/Users/os/Documents/Codex/2026-09-10/chu/outputs/hcmc-poc/data/scene.json), [manifest ảnh TP.HCM](/Users/os/Documents/Codex/2026-09-10/chu/outputs/hcmc-poc/research/facades-15/manifest.json), [Verify 16d](/Users/os/Documents/Codex/2026-09-10/chu/outputs/hcmc-poc/research/vibecode-16d/VERIFY.md), [README Gia Lộc S07](/Users/os/Documents/Codex/2026-09-10/chu/outputs/tayninh-data-batch-04/README-S07.md) và [solution-data](/Users/os/Documents/Codex/2026-09-10/chu/outputs/tayninh-data-batch-04/derived/solution/solution-data.json).

## 3. Cập nhật trạng thái so với báo cáo trước

**Gia Lộc có kết quả triển khai mới:** địa hình và ảnh/tán cây raster có vị trí và metadata; mô hình chiều cao Google có kiểm điều kiện; ô 52 nhà có PBR/cửa/mái, cây có thân/nhánh/lá; LOD, Worker, phân ô/cache và bộ kiểm tệp thật. Dữ liệu biến động Sentinel đã có ở Batch03. Các dòng R12/R14 được công nhận có thành phần địa hình bối cảnh; R10 có thành phần nhiều kỳ; R20/R22 có tiến bộ kiến trúc. Không đổi thành “đã đạt khảo sát/phân tích nghiệp vụ”. [Đối chiếu Gia Lộc S07](DOI-CHIEU-GIA-LOC-S07.md).

**TP.HCM chưa tự nhận các thay đổi Gia Lộc:** Git vẫn là **c8045b8, PoC16d ngày 13/09/2026**, không có thay đổi chưa commit trong `outputs/hcmc-poc` ở lượt kiểm này. Nền 38,57 km², lớp ảnh, landmark, UI kính/thu gọn, tham quan/ngày–đêm vẫn được giữ. `planning-16.json` vẫn `geometryReady=false`, `geometryLayers=[]`, `planningStages=[]`; chưa có tương lai hình học hay A/B/C định lượng. Nguồn mới xác minh ở lượt này cải thiện khả năng tiếp cận R11/R12, chưa là đầu ra đã nhập vào map. [planning-16](/Users/os/Documents/Codex/2026-09-10/chu/outputs/hcmc-poc/data/planning-16.json).

**Khoảng cách chung vẫn còn:** vẽ vùng tùy ý, truy vấn đối tượng, buffer tuyến, bảng tác động A/B/C, mặt cắt/cut–fill/LOS, CAD/BIM/as-built, báo cáo vùng và KPI quản lý. “14/14 phần mềm S07” và các PASS của 16d không đồng nghĩa đáp ứng hai tài liệu Digital Twin.

## 4. Cách triển khai chung, hai bộ dữ liệu địa phương

1. **Tách lõi dùng chung:** bản ghi nguồn/quyền/ngày/CRS/hệ cao/QC; ID và quan hệ building/part; kernel GIS và phân tích 3D; bộ nạp dữ liệu/phiên bản; engine hiển thị và báo cáo. Dữ liệu hình học và hồ sơ từng địa phương nằm trong gói riêng. Đây là kiến trúc đề xuất, chưa có một lõi hợp nhất hoàn chỉnh.
2. **Khép một vòng quản lý trước:** vùng/tuyến người dùng chọn → đếm/diện tích phần giao → buffer → phương án A/B/C → báo cáo kèm nguồn và mức tin cậy. Dùng được footprint có sẵn của cả hai nơi; chưa suy ra số hộ/thửa/giá bồi thường từ số khối nhà.
3. **Gia Lộc ưu tiên:** thống kê vùng đất/nhà/cây/nước, tác động tuyến/dự án, profile địa hình sơ bộ; mở rộng theo ranh phường chuẩn rồi nối KCN/nông nghiệp/thoát nước khi có dữ liệu. Các tính toán raster 30 m phải mang giới hạn độ phân giải.
4. **TP.HCM ưu tiên:** nâng nền địa hình và ảnh nhiều kỳ theo phương pháp Gia Lộc; giữ mặt đứng/landmark/UI đã có; bổ sung phân ô/LOD cho vùng lớn sau kiểm hiệu năng; nhận một bộ quy hoạch GIS đúng khu mẫu để đối chiếu chỉ tiêu/lộ giới và tác động phương án. Không sao chép tọa độ hoặc chiều cao Gia Lộc sang TP.HCM.
5. **Sa bàn tầm nhìn:** giữ hiện trạng và phương án thành lớp riêng, mỗi phương án gắn hồ sơ, phiên bản, phạm vi, trạng thái dự kiến/phê duyệt và phân kỳ được nguồn hỗ trợ. Chỉ nhập hình học tương lai khi thu được hồ sơ phù hợp. Tin về tầm nhìn 100 năm không cung cấp đầy đủ các chi tiết để tự dựng.

Hướng tích hợp GIS, kho không gian, API có phân quyền, dashboard và mô phỏng Digital Twin cũng được đề cập trong [tài liệu kế hoạch 2026–2030 công khai trên Sở QHKT](https://qhkt.hochiminhcity.gov.vn/Media/Uploads/2026/1720.KH-SQHKT_23.3.2026.pdf). Đây là căn cứ tham khảo để làm giải pháp phù hợp đầu mối thành phố; không chứng minh RtR đã tích hợp hay nghiệm thu với hệ thống đó.

## 5. Nguồn bổ sung dùng cho cả hai địa phương

- **Google Open Buildings Temporal 2016–2023:** có hiện diện/số lượng phân số/chiều cao mô hình, raster cung cấp 0,5 m nhưng **độ phân giải hiệu dụng 4 m**; dữ liệu từ Sentinel-2. Có thể thêm lịch sử bối cảnh và kiểm chéo chiều cao, không dùng như ảnh 0,5 m thực hay khảo sát mới. Chưa có pipeline lịch sử đối tượng hoàn chỉnh trong hai PoC. [Catalog chính thức](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1).
- **Overture:** tải theo bbox, giữ release và nguồn/theme; giúp cập nhật footprint/POI và kiểm tra phần thiếu. Cả hai đã khai thác nguồn footprint mở; bổ sung/tải mới phải kiểm trùng và phạm vi, không coi là một công trình thực mới chỉ vì ID khác. [Hướng dẫn chính thức](https://docs.overturemaps.org/getting-data/).
- **GlobalBuildingAtlas:** có gói polygon/chiều cao/LoD1 để khảo sát so sánh, chưa tải/QC tile hai AOI ở lượt này. Gói polygon ODbL tách khỏi phần polygon/height/LoD1 **CC BY-NC 4.0**; mã có Commons Clause. Không đưa phần NC vào giải pháp thương mại RtR như nguồn mở thương mại tự do. Đây là nguồn nghiên cứu có điều kiện, không thay thế mặt đứng hay dữ liệu khảo sát. [Repo của nhóm tác giả](https://github.com/zhu-xlab/GlobalBuildingAtlas).

## 6. Tiếp cận thực tế và phạm vi xác minh

Phân biệt ba trạng thái: **dữ liệu đã ở PoC**; **dữ liệu/metadata công khai đã đọc nhưng chưa tải/QC**; **đầu mối cần quyền hoặc chia sẻ**. Gói dữ liệu mới chỉ được nâng trạng thái sau khi nhận tệp, xác minh giấy phép, AOI, CRS/hệ cao, ngày, độ phân giải và chất lượng.

[Cổng dữ liệu Thành phố](https://data.hochiminhcity.gov.vn/) tách cổng cho doanh nghiệp/người dân và cổng cho cơ quan nhà nước. Lượt web đọc được trang giới thiệu/danh mục/tài liệu hướng dẫn, nhưng chưa truy xuất lớp GIS hoặc raw point cloud. Hướng dẫn [GIS Xây dựng](https://api-gisxaydung.tphcm.gov.vn/resources/LuuTruQuyHoach/document/Tai%20lieu%20HDSD%20ung%20dung_Tra%20cuu%20thong%20tin%20QH.pdf) nêu kết quả tra cứu mang tính tham khảo; phải lần về quyết định và hồ sơ phù hợp khi trình dự án. Không dùng ảnh nền được xem qua dịch vụ như một giấy phép tải/bake vào gói RtR.

Đánh giá “TP.HCM thuận lợi hơn” là suy luận từ các nguồn đã xác minh và hai gói đang có, không phải kiểm kê toàn Internet hay đo định lượng mức đầy đủ của hai địa phương. Các phát hiện này là **mới xác minh trong lượt kiểm**, không phải tất cả vừa được công bố hôm nay. Chưa thay đổi trạng thái nghiệm thu gốc vì chưa nhập/QC dữ liệu mới hoặc xây công cụ quản lý còn thiếu.
