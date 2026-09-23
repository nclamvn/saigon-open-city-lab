# Kiến trúc mưa – ngập – triều cường cho HCMC Digital Twin

**Trạng thái:** kiến trúc 25A; chưa phải dự báo ngập vận hành.
**Nguyên tắc:** mọi lớp độ sâu phải mang nhãn chất lượng. Không biến mô phỏng chưa hiệu chỉnh thành “sự thật” trên bản đồ.

## Kết luận khả thi

Có thể bổ sung mưa và mô hình hóa ngập kết hợp triều ngay trên nền 3D hiện hành. Three.js/WebGPU đảm nhiệm hiển thị mưa, mặt nước, chiều sâu và diễn biến theo thời gian; phép tính thủy văn – thủy lực phải chạy ở engine chuyên dụng. Lõi phù hợp là mạng thoát nước 1D bằng EPA SWMM kết hợp mặt chảy tràn 2D bằng HEC-RAS 2D hoặc solver phương trình nước nông tương đương. Mực nước sông/triều đi vào mô hình như chuỗi điều kiện biên hạ lưu.

EPA mô tả SWMM là phần mềm miễn phí, mã nguồn mở để mô phỏng dòng chảy đô thị, mạng cống, cửa thu, thấm, trữ và định tuyến sóng động. HEC-RAS hỗ trợ dòng không ổn định 1D/2D, mạng ống và mưa phân bố theo lưới hoặc trạm. Đây là nền kỹ thuật đúng cho bài toán, thay vì chỉ dâng một mặt phẳng nước theo cao độ.

## Phạm vi sản phẩm toàn thành phố

Thảo Điền là nơi kiểm chứng đầu tiên, không phải giới hạn không gian của sản phẩm. Hệ thống đích phải phủ toàn bộ địa giới chính thức của TP.HCM theo kiến trúc phân lưu vực và nhiều mức phân giải:

- Toàn thành phố có tile tổng quan về độ sâu cực đại, thời gian bắt đầu ngập, thời gian rút, tuyến giao thông và công trình chịu ảnh hưởng.
- Lưu vực có rủi ro cao dùng lưới 2D chi tiết hơn và mạng cống 1D đầy đủ hơn.
- Mỗi ô/tuyến/công trình mang cả kết quả mô phỏng lẫn cấp độ tin cậy, nguồn đầu vào và thời điểm chạy.
- Bản đồ 3D dựng mặt nước theo trường độ sâu, không dâng đồng loạt một mặt phẳng. Mực nước phải bám địa hình, vật cản, cống thoát và điều kiện biên sông/triều theo từng bước thời gian.

## Mưa và triều phải có trần khoa học

Giao diện không dùng thanh kéo tự do theo mm mưa hoặc mét triều. Miền điều khiển được sinh từ dữ liệu và khóa phiên bản:

### Mưa

- **Sự kiện quan trắc:** chọn một trận mưa có chuỗi thời gian thực đo; giữ nguyên tổng lượng, thời lượng và hình dạng trận mưa.
- **Mưa thiết kế:** chọn chu kỳ lặp lại đã được duyệt; engine lấy đường IDF/DDF theo trạm và thời đoạn, phù hợp nguyên tắc thiết kế thoát nước trong TCVN 7957:2023.
- **Kịch bản khí hậu:** chỉ dùng mức gia tăng từ tài liệu/quy hoạch được phê duyệt và luôn ghi năm mục tiêu.
- Trần mưa không phải một con số chung cho mọi nơi. Nó phụ thuộc trạm, thời đoạn, chu kỳ lặp lại và kịch bản khí hậu; vì vậy chỉ được tính sau khi registry có đường IDF/DDF chính thức.

### Triều

- Chọn đường quá trình mực nước thực đo tại trạm Phú An/Nhà Bè hoặc cấp báo động chính thức, cùng hệ cao độ đã khai báo.
- Kịch bản nước biển dâng phải gắn với năm và nguồn được phê duyệt.
- Không cho người dùng nhập một mực triều tùy ý. Trần hiển thị là cực trị quan trắc hoặc kịch bản thiết kế đã đăng ký cho đúng hệ cao độ.

### Tổ hợp mưa–triều

- Sự kiện quá khứ phải giữ đúng cặp mưa và triều theo dấu thời gian.
- Kịch bản tổng hợp phải dựa trên xác suất đồng thời, không ghép tùy tiện hai giá trị cực đại độc lập.
- Tổ hợp cực đoan chỉ được mở dưới nhãn **“stress test”**, tách khỏi **“dự báo”** và **“kịch bản thiết kế”**.

Sở KH&CN TP.HCM đã công bố hướng xây dựng ba cấp cảnh báo từ chuỗi khí tượng thủy văn 1990–2024, khảo sát thực địa và mô hình tổ hợp triều, lũ, mưa. Đây là tiền lệ phù hợp để xây ma trận cảnh báo ba cấp; ngưỡng số cụ thể chỉ được đưa vào hệ thống sau khi tiếp nhận đúng bảng ngưỡng và hệ cao độ của thành phố.

## Chuỗi xử lý

1. **Thu nhận có provenance:** mưa trạm, mưa vệ tinh/tái phân tích, mực nước Phú An–Nhà Bè, DEM/DTM, phủ bề mặt, cống–hố ga–cửa thu, trạm bơm/cống kiểm soát triều và quan sát ngập.
2. **Chuẩn hóa:** thời gian UTC+7, hệ tọa độ solver thống nhất, đơn vị SI, cờ chất lượng, dấu thời gian, phạm vi và giấy phép.
3. **Mô hình 1D:** chia lưu vực con; khai báo độ thấm, tỷ lệ bề mặt không thấm, hố ga/cửa thu, cống, bơm và cửa xả trong SWMM.
4. **Mô hình 2D:** dựng lưới mặt đất từ DTM; giữ đường, bó vỉa, kênh rạch và vật cản quan trọng bằng breakline/subgrid; giải độ sâu và vận tốc trên mặt.
5. **Ghép mưa–cống–triều:** trao đổi lưu lượng tại cửa thu/hố ga; gắn chuỗi mực nước sông/triều vào cửa xả. Tổ hợp này mới biểu diễn được mưa lớn đúng lúc triều cao làm giảm khả năng thoát.
6. **Hiệu chỉnh và kiểm định:** dùng một nhóm sự kiện để hiệu chỉnh, một nhóm độc lập để kiểm định; so độ sâu, phạm vi, thời điểm bắt đầu và thời gian rút nước.
7. **Phát hành 3D:** chuyển mỗi bước thời gian thành tile độ sâu/vận tốc; WebGPU nội suy, dựng mặt nước, mưa, vùng đường bị gián đoạn và bảng diễn biến.

## Nguồn dữ liệu có thể tiếp cận

| Nhóm | Nguồn | Vai trò | Giới hạn phải hiển thị |
|---|---|---|---|
| Mưa địa phương | Mạng trạm và nền tảng ngập của TP.HCM | Nguồn ưu tiên để hiệu chỉnh theo phút | Cần quyền truy cập/API hoặc bàn giao dữ liệu |
| Mưa công khai | NASA GPM IMERG V07 | Chuỗi mưa 30 phút, ô 0,1° cho lịch sử/kịch bản | Quá thô cho kết luận ở từng con phố; cực trị có thể bị làm trơn |
| Khí tượng lịch sử | ERA5-Land | Chuỗi giờ dài hạn, nền cho kịch bản | Không thay thế trạm mưa đô thị |
| Triều/sông | Phú An, Nhà Bè và trạm thủy văn địa phương | Điều kiện biên hạ lưu ưu tiên | Cần cao độ chuẩn và chuỗi cùng thời gian với mưa |
| Mực nước biển | Copernicus Marine | Nguồn đối chiếu/kịch bản khu vực | Không thay thế mực nước thực đo trong sông Sài Gòn |
| Địa hình | LiDAR/DTM thành phố hoặc payload Hera tương lai | Lớp bắt buộc để đạt cấp kỹ thuật | Cần mặt đất trần, cao độ bó vỉa/cống, sai số đứng được công bố |
| Địa hình công khai | Copernicus DEM GLO-30 | Dựng kịch bản thô và kiểm pipeline | Là DSM 30 m chứa công trình/cây; không đủ cho dòng chảy theo phố |
| Thoát nước | Hồ sơ cống, hố ga, cửa thu, bơm và cửa kiểm soát triều | Lõi của mô hình 1D | Không được tự bịa đường kính, cao độ đáy hoặc công suất |
| Kiểm định | Sentinel-1 GRD, camera, báo cáo điểm ngập, đo sâu hiện trường | Phạm vi ngập và diễn biến sự kiện | SAR cần xử lý nhiễu/địa hình; camera cần quy đổi cao độ tin cậy |

Các nguồn gốc đã rà soát:

- [EPA Storm Water Management Model (SWMM)](https://www.epa.gov/water-research/storm-water-management-model-swmm)
- [HEC-RAS và tài liệu 1D/2D chính thức](https://www.hec.usace.army.mil/software/hec-ras/)
- [HEC-RAS: mưa phân bố theo lưới hoặc trạm](https://www.hec.usace.army.mil/confluence/rasdocs/r2dum/6.5/boundary-and-initial-conditions-for-2d-flow-areas/global-boundary-conditions)
- [NASA GPM IMERG V07](https://gpm.nasa.gov/data/imerg)
- [Copernicus ERA5-Land](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=download)
- [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
- [Copernicus Sentinel-1](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-1)
- [Copernicus Marine Data Store](https://data.marine.copernicus.eu/)
- [Nghiên cứu và bản đồ thiệt hại ngập 1:10.000 của Sở KH&CN TP.HCM](https://dost.hochiminhcity.gov.vn/tiem-luc/ket-qua-nckh/dieu-tra-khao-sat-va-danh-gia-thiet-hai-do-ngap-lut-den-kinh-te-xa-hoi-xay-dung-ban-do-thiet-hai-do-ngap-lut-phuc-vu-cong-tac-chong-ngap-quy-hoach-do-thi-tren-dia-ban-thanh-pho-ho-chi-minh/)
- [Cổng dữ liệu TP.HCM](https://data.hochiminhcity.gov.vn/)
- [TCVN 7957:2023 — yêu cầu thiết kế mạng lưới và công trình thoát nước](https://files.thuvienphapluat.vn/uploads/DOC2HTM/TC_920474.htm)
- [Sở KH&CN TP.HCM — ba cấp cảnh báo ngập từ tổ hợp triều, lũ và mưa](https://dost.hochiminhcity.gov.vn/hoat-dong-so-khcn/tp-ho-chi-minh-xay-dung-he-thong-moc-canh-bao-ngap-lut-tang-kha-nang-ung-pho-thien-tai-do-thi/)

## Ba mức sản phẩm

### Mức 1 — trình diễn có kiểm soát

Thời gian mục tiêu 3–5 ngày sau khi chốt phạm vi mẫu. Dùng mưa IMERG/ERA5-Land, DEM công khai, phủ bề mặt và điểm ngập đã biết để chứng minh luồng dữ liệu, thanh chỉnh lượng mưa/triều và hoạt ảnh 3D. Nhãn bắt buộc: **“Kịch bản minh họa — chưa hiệu chỉnh; không dùng để dự báo hoặc thiết kế.”**

### Mức 2 — thử nghiệm cấp quận

Dùng trạm mưa địa phương, mực nước sông/triều cùng sự kiện, DTM tốt hơn, một phần mạng thoát nước và quan sát ngập. Kết quả gồm độ sâu cực đại, thời gian đến ngập, thời gian rút và tuyến đường bị gián đoạn, kèm sai số kiểm định.

### Mức 3 — mô hình kỹ thuật đô thị

Cần LiDAR/DTM 0,5–2 m, cao độ bó vỉa/cửa thu, mạng cống đầy đủ, trạng thái bơm/cửa kiểm soát triều, dữ liệu lún nếu có, nhiều sự kiện đo sâu và bộ kiểm định độc lập. Mỗi lần phát hành phải lưu phiên bản đầu vào, tham số, solver, sai số và log chạy.

## Giao diện lãnh đạo

- Một thanh thời gian từ lúc bắt đầu mưa đến lúc rút nước.
- Ba điều khiển chính: **kịch bản mưa**, **kịch bản triều**, **trạng thái hệ thống thoát nước**. Mỗi điều khiển chỉ chọn giá trị trong catalog khoa học đã duyệt; không có slider vô hạn.
- Màu độ sâu cố định: dưới 0,10 m; 0,10–0,30 m; 0,30–0,50 m; trên 0,50 m, có chú giải và dấu thời gian.
- Nút so sánh A/B: hiện trạng và phương án; ví dụ thêm hồ điều tiết, nâng công suất bơm hoặc đóng/mở cống kiểm soát triều.
- KPI: diện tích ngập, số công trình chịu ảnh hưởng, km đường gián đoạn, thời điểm đỉnh và thời gian rút.
- Mỗi cảnh luôn hiện cấp bằng chứng: **minh họa**, **hiệu chỉnh cục bộ** hoặc **kỹ thuật**.

## Bước triển khai đề nghị

1. **25A — Data registry:** kết nối nguồn mưa, triều, DEM và quan sát ngập; đóng dấu nguồn, thời gian, độ phân giải và giấy phép.
2. **25B — Pilot Thảo Điền:** mở rộng vùng cảnh hiện tại về phía bắc/đông để phủ hành lang Quốc Hương–Thảo Điền–Nguyễn Văn Hưởng–Trần Ngọc Diện; tạo DTM thủy lực, lưu vực con và điều kiện biên sông Sài Gòn.
3. **25C — Solver:** chạy SWMM + 2D cho tối thiểu ba tổ hợp mưa/triều; lưu output theo tile thời gian.
4. **25D — WebGPU flood layer:** mưa có cường độ, mặt nước theo độ sâu, đường bị gián đoạn, biểu đồ thời gian và A/B.
5. **25E — Calibration gate:** chỉ đổi nhãn sang “đã hiệu chỉnh” khi đạt tiêu chí sai số được thành phố và nhóm thủy lực phê duyệt.

Hợp đồng máy đọc cho pipeline nằm tại `outputs/hcmc-poc/data/flood-model-contract-25.json`.

## Hiệu chỉnh phạm vi pilot

Không dùng Nguyễn Huệ–Bạch Đằng–Ba Son làm vùng thí điểm ngập. Khu vực này tiếp tục là cảnh trình diễn đô thị, chỉ được hiện lớp ngập nếu một sự kiện quan trắc cụ thể chứng minh có ngập tại đúng vị trí và thời điểm.

Pilot được chuyển sang **hành lang Quốc Hương–Thảo Điền–Nguyễn Văn Hưởng–Trần Ngọc Diện**. Lý do chọn:

- Báo cáo của cơ quan thành phố ghi nhận trận mưa gần 200 mm tại Thanh Đa/Nguyễn Hữu Cảnh đã gây ngập sâu tại Nguyễn Văn Hưởng, Thảo Điền và Quốc Hương; có nơi ngập kéo dài hơn 6 giờ. Các điểm mẫu trong báo cáo có độ sâu khoảng 200–250 mm.
- Ghi nhận ngày 08/10/2025 cho thấy mưa lớn kết hợp triều cường làm Quốc Hương ngập 30–50 cm và đoạn Thảo Điền từ Nguyễn Văn Hưởng đến Quốc Hương ngập khoảng 40 cm.
- Khu vực nằm sát sông Sài Gòn nên thể hiện đúng bài toán ghép mưa đô thị, khả năng thoát nước và mực triều hạ lưu.

Nguồn đối chiếu phạm vi:

- [Trung tâm Quản lý Hạ tầng kỹ thuật TP.HCM — báo cáo cảnh báo sớm ngập lụt](https://ttqlhtkt.hochiminhcity.gov.vn/documents/20197/31303/3.%2BBCTongHop_CanhBaoSomNgapLut-AI.pdf/5068c1da-04ed-4580-b7b6-127c7a40d74e)
- [HĐND TP.HCM — sự kiện mưa lớn kết hợp triều cường ngày 08/10/2025](https://hdnd.hochiminhcity.gov.vn/tin-tuc/tin-tong-hop/tphcm-mua-lon-ket-hop-trieu-cuong-gay-ngap-nhieu-noi)
- [Sở KH&CN TP.HCM — các vị trí camera giám sát điểm ngập](https://dost.hochiminhcity.gov.vn/hoat-dong-so-khcn/gan-canh-bao-va-giam-sat-ngap-voi-van-hanh-do-thi-thong-minh/)

BBox hiện hành của cảnh 3D kết thúc tại khoảng 106,739°E và 10,808°N, do đó mới phủ một phần Thảo Điền. Batch 25 phải mở rộng tile về phía bắc/đông trước khi dựng lưu vực; không được ép mô hình vào ranh giới cảnh hiện tại chỉ để tái sử dụng hình ảnh.
