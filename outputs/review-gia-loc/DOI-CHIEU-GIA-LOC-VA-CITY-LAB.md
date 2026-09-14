# Đối chiếu hai tài liệu Gia Lộc với City Lab TP.HCM

Ngày đánh giá: 14/09/2026. Mốc code: c8045b8 (PoC 16d). Phạm vi là đánh giá, chưa thay đổi ứng dụng hay triển khai thu thập dữ liệu mới.

**Kết luận:** City Lab có nền trình diễn 3D và một phần hạ tầng dữ liệu có thể tái sử dụng. Chưa đáp ứng hệ thống Digital Twin phục vụ đo đạc, truy vấn quản lý và mô phỏng định lượng được mô tả trong hai tài liệu. Khoảng cách chính nằm ở dữ liệu hiện trạng có kiểm chứng, công cụ GIS/phân tích 3D và liên kết hồ sơ nghiệp vụ; tăng độ đẹp của vật liệu không tự khép được khoảng cách này.

## 1. Đã đọc gì và tài liệu thực sự yêu cầu gì?

Hai bản Word là **tài liệu định hướng ứng dụng/ngân hàng câu hỏi**, không phải hồ sơ thiết kế kỹ thuật, hợp đồng triển khai hay bộ tiêu chí nghiệm thu hoàn chỉnh. Các mục có ký hiệu D không có nghĩa dữ liệu bất kỳ đều trả lời được: phải có đúng lớp dữ liệu, độ đầy đủ và chất lượng phù hợp. Một số câu X chủ đích nêu những điều công nghệ không thể tự trả lời, không phải chức năng phải xây.

- [Tài liệu 2D gốc](/Users/os/Downloads/Digital_Twin_2D_Phuong_Gia_Loc_Tay_Ninh_GSD_1cm.docx): 125 câu trong 12 nhóm, gồm 73 D, 36 K, 16 X.
- [Tài liệu 3D + LiDAR gốc](/Users/os/Downloads/Digital_Twin_3D_LiDAR_Phuong_Gia_Loc_Tay_Ninh.docx): 112 câu trong 12 nhóm, gồm 69 D, 27 K, 16 X.
- D = có thể trả lời trực tiếp từ bộ dữ liệu Digital Twin phù hợp; K = phải kết hợp hồ sơ/lớp chuyên ngành; X = sàng lọc/ước tính hoặc giới hạn, cần kiểm chứng thêm.
- Đã trích toàn bộ 237 câu, giữ nguyên mức do tác giả gán, trong [question-inventory.csv](question-inventory.csv). Số câu này không dùng làm mẫu số phần trăm hoàn thành sản phẩm vì nhiều câu trùng phép toán, có điều kiện hoặc nêu giới hạn.

Bối cảnh Gia Lộc mới gồm xã Phước Đông thuộc huyện Gò Dầu cũ và phường Gia Lộc, được nêu tại khoản 96 Điều 1 của [Nghị quyết 1682/NQ-UBTVQH15 trên Cổng Chính phủ](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-1682-nq-ubtvqh15-sap-xep-cac-dvhc-cap-xa-cua-tinh-tay-ninh-nam-2025-119250616210257367.htm). Vì vậy tài liệu thiết kế tình huống cho địa bàn có đô thị, nông nghiệp, khu công nghiệp Phước Đông, dự án/GPMB, kênh và hành lang hạ tầng. Việc xác nhận địa danh này không đồng nghĩa toàn bộ các nguồn quy hoạch khác trong tài liệu đã được kiểm định lại.

### Lớp 2D

Nền đầu vào là true orthomosaic/orthophoto UAV khoảng 1 cm/pixel, chia tile để xem nhanh. Sau đó phải bóc tách thành các đối tượng có ID, hình học, thuộc tính, liên kết ảnh gốc và thời điểm: công trình, đường, cây, cây trồng, nước, đất trống, công trường, vật cản… Hồ sơ địa chính/quy hoạch/tài sản được tích hợp riêng.

Sáu phép cơ bản là **lọc, đếm, đo, buffer, giao/chồng lớp và so sánh thời gian**. Người dùng cần chọn theo địa chỉ, đối tượng, vùng vẽ, bán kính hoặc tuyến; thay tham số/phương án A–B–C và nhận bảng kết quả/báo cáo. Một lớp đường được vẽ trên màn hình chưa tương đương chức năng tính số nhà bị ảnh hưởng nếu mở rộng đường.

12 nhóm câu hỏi 2D gồm: điều hành tổng hợp; địa chính/đất đai; quy hoạch/xây dựng; đầu tư/GPMB; nông nghiệp; môi trường/mặt nước; giao thông; thoát nước/ngập; công nghiệp/đầu tư; PCCC/an ninh; tài sản công/dịch vụ; theo dõi biến động.

### Lớp 3D + LiDAR

Kế thừa lớp 2D, bổ sung point cloud, DTM (địa hình mặt đất), DSM (bề mặt gồm nhà/cây), mesh/mô hình 3D và ảnh trực giao, với hệ tọa độ, hệ cao độ và QC. Các phép mới là cao độ, chiều cao, độ dốc, mặt cắt, thể tích, đào/đắp, đường nhìn, tĩnh không, so sánh surface/as-built qua các kỳ. Tích hợp thêm CAD/BIM, thủy văn, utility và hồ sơ tài sản/PCCC tùy câu hỏi.

12 nhóm câu hỏi 3D gồm: điều hành/mô phỏng; quy hoạch/chiều cao; địa hình/đất; thi công; giao thông/mặt cắt; thoát nước; tán cây/nông nghiệp; điện/viễn thông; môi trường/khối lượng; công nghiệp/PCCC; tài sản/bảo trì; biến dạng/as-built theo thời gian.

Tài liệu 3D đề xuất triển khai **hai tầng**: 2D phổ cập toàn phường; 3D/LiDAR tập trung nơi tạo giá trị cao như KCN, trục giao thông, vùng đầu tư, kênh, vùng ngập và hành lang điện. Không yêu cầu mọi nơi đều phải có cùng mức chi tiết 3D.

### Những điều không được hứa

GSD 1 cm là khoảng lấy mẫu ảnh, không phải chứng nhận sai số tọa độ 1 cm. [PIX4D](https://support.pix4d.com/hc/en-us/articles/202558889) phân biệt độ chính xác tương đối/tuyệt đối và khuyến nghị điểm kiểm tra độc lập để đánh giá kết quả. LiDAR không tự bảo đảm đạt chuẩn khảo sát. Theo chính hai tài liệu, hạ tầng ngầm, đáy nước, ô nhiễm hóa học, chủ sở hữu đất, pháp lý và an toàn kết cấu/PCCC đều cần dữ liệu/phương pháp chuyên ngành tương ứng.

Hai tài liệu chưa chốt diện tích AOI kỹ thuật, sai số XY/Z nghiệm thu, mật độ điểm, độ đầy đủ theo lớp, quy tắc phân loại, chu kỳ cập nhật, ngưỡng chất lượng AI, định dạng bàn giao chi tiết và giá trị mục tiêu của KPI. Cần bổ sung các tiêu chí đó khi chuyển thành yêu cầu dự án TP.HCM.

## 2. City Lab đang có gì thực sự?

Bằng chứng đọc trực tiếp từ mã, dữ liệu và hồ sơ kiểm tra:

1. [quality-report.json](../hcmc-poc/data/quality-report.json): phạm vi hình chữ nhật khoảng **38,57 km²**, **70.719 khối** (có building parts, không phải 70.719 nhà đã xác minh), 12.043 đối tượng đường. Đây là vùng trung tâm thử nghiệm, không phải toàn địa giới TP.HCM.
2. Cùng báo cáo: **70.017 khối thuộc nhóm chiều cao ước lượng**, khoảng 99,01% bộ nền; 448 suy từ số tầng, 191 có height tag, 63 podium. Có số liệu nguồn không có nghĩa đã đo kiểm; các hiệu chỉnh cục bộ sau đó vẫn gần đúng.
3. Nền phẳng tham chiếu; phép chiếu mét cục bộ để hiển thị. Không có hệ tọa độ/cao độ khảo sát đã được nghiệm thu. Làm tròn tọa độ tới 0,01 m không chứng minh chính xác centimet.
4. Ảnh nền EOX/Sentinel 2016–2017. Không có orthophoto UAV GSD 1 cm của khu mẫu TP.HCM.
5. [manifest mặt đứng](../hcmc-poc/research/facades-15/manifest.json): 20 mục, 15 đủ điều kiện pipeline, 5 đang giữ lại do bề mặt/ảnh chưa phù hợp. Vietcombank dùng vỏ lấy mẫu ảnh; Times Square 16d giữ ảnh thật vùng quan sát và nối vật liệu suy dựng. Đây chưa phải bộ 20 công trình được tái dựng/đo kiểm đầy đủ. Ảnh nhiều thời điểm 2006–2025.
6. [Reality Patch](../hcmc-poc/data/reality-patch-manifest.json): khu 1,687 km², 16 tile, 2.006 khối proxy; coverage reality mesh 0%, GCP 0. Có một GLB procedural 193 khối, không phải dữ liệu quét hay photogrammetry. Coverage 0% ở đây nói về reality mesh của patch, không phủ nhận ảnh mặt đứng đã bổ sung ở pipeline riêng.
7. [height-region-report.json](../hcmc-poc/data/height-region-report.json): thử nghiệm cao độ/chiều cao từ nguồn raster so sánh được 20.178 ứng viên. Báo cáo nói rõ chênh lệch giữa nguồn **không phải sai số khảo sát**, không chứng minh nâng độ chính xác.
8. [planning-16.json](../hcmc-poc/data/planning-16.json): bốn đầu mối tài liệu, `geometryReady=false`, `geometryLayers=[]`, `planningStages=[]`. Chưa có lớp quy hoạch tương lai đối chiếu được.
9. Giao diện có khám phá, chọn công trình, xem nguồn, tour, ngày/đêm, A/B ảnh–nền, thu gọn thông tin, điều hướng và xuất ảnh. `serve.py` là server preview và lưu capture, chưa phải nền dịch vụ GIS dùng chung cho cơ quan.
10. Có fingerprint, giấy phép, snapshot, validation và các báo cáo QA/hiệu năng. PASS kỹ thuật xác nhận những hợp đồng dữ liệu/hành vi cụ thể, không thay cho kiểm tra sai số thực địa hoặc nghiệm thu nghiệp vụ.

## 3. Ma trận yêu cầu và khoảng cách

“Có” chỉ công nhận thành phần nêu trong dòng. “Một phần” không đồng nghĩa chức năng quản lý đã hoàn chỉnh. “Chưa” nghĩa chưa có bằng chứng đáp ứng trong mốc code/dữ liệu được kiểm tra.

| ID | Yêu cầu áp dụng từ tài liệu | Hiện tại | Thiếu để đáp ứng |
|---|---|---|---|
| R01 | Giao diện trực quan cho lãnh đạo (2D §7; 3D §3A) | **Có thành phần trình diễn**: map, tour, chọn nhà, bảng nguồn | Demo phải nối được câu hỏi → kết quả đo/đếm, không chỉ đổi góc nhìn |
| R02 | Nền phủ phạm vi quản lý (2D §0–1) | **Một phần**: 38,57 km² vùng trung tâm | Ranh AOI/địa giới chính thức, kiểm kê coverage, dữ liệu phần ngoài |
| R03 | Orthophoto/true ortho ~1 cm, tile (2D bảng nền) | **Chưa đạt** | Ảnh có quyền dùng, metadata GSD, khống chế, QC và hệ phục vụ tile ảnh |
| R04 | Đối tượng ID + hình học + thuộc tính + nguồn + thời gian (2D §1) | **Một phần** cho khối nhà và nguồn ảnh | ID quản lý ổn định, liên kết đa nguồn/đa kỳ, danh mục và ontology nghiệp vụ |
| R05 | Bóc tách AI đủ các lớp bề mặt/đối tượng (2D bảng nền) | **Chưa có pipeline tại địa bàn với QC**; đang dùng lớp mở và chi tiết procedural | Ảnh đầu vào, mô hình theo lớp, mẫu kiểm chứng, độ đầy đủ và độ chính xác |
| R06 | Lọc và đếm đối tượng theo vùng người dùng chọn (2D A4/A10, C1) | **Một phần dữ liệu nền**, chưa có quy trình truy vấn tương tác | Vẽ polygon, chọn lớp, tính giao, loại trùng building/parts, trả danh sách ID |
| R07 | Đo diện tích/chiều dài/khoảng cách (2D §1) | **Chưa có công cụ nghiệp vụ được kiểm chứng** | Hệ đo, định nghĩa phép đo, sai số, công cụ và xuất kết quả |
| R08 | Buffer tuyến/bán kính; chồng lớp (2D A5, B, D, H) | **Chưa triển khai cho người dùng** | Engine GIS và các lớp ranh/hành lang chính thức; kiểm tra giao cắt |
| R09 | So sánh phương án A/B/C (2D D5; 3D A4/A8) | **Chưa**; A/B đang là bật/tắt ảnh | Quản lý scenario, tham số, tính tác động, bảng so sánh cùng dữ liệu nền |
| R10 | So sánh thời gian và cảnh báo biến động (2D L; 3D L) | **Chưa**; snapshot nguồn chưa phải đồng bộ hiện trạng nhiều kỳ | Các kỳ đo đăng ký đồng nhất, matching ID, sai số phát hiện, duyệt cảnh báo |
| R11 | Địa chính, quy hoạch, dự án và tài sản (2D bảng tích hợp) | **Một phần tìm nguồn quy hoạch**; chưa nhập lớp nghiệp vụ | Dữ liệu GIS/CAD gốc có phiên bản, quyền dùng, CRS và hồ sơ liên kết |
| R12 | Point cloud LiDAR, DTM, DSM có QC (3D bảng nền, §2) | **Chưa có** | Bộ dữ liệu thực, phân loại ground/non-ground, khống chế và checkpoint |
| R13 | Hình học 3D thực của nhà/cây/đường/hạ tầng (3D B, E, G, H) | **Một phần hình thức hiển thị** | Hình học và định danh đã kiểm chứng; mặt khuất, đường dây, cây cá thể và địa hình |
| R14 | Cao độ, dốc, mặt cắt (3D A/C/E/F) | **Chưa đáp ứng** do nền phẳng | DTM/DSM và công cụ tính/trích có QC |
| R15 | Thể tích, stockpile, đào/đắp (3D C/D/I) | **Chưa triển khai** | Surface thực, surface thiết kế, vùng tính và kiểm chứng thể tích |
| R16 | Đường nhìn, tĩnh không, xung đột cây–dây–nhà (3D B/E/H/J) | **Chưa triển khai được kiểm chứng** | Đối tượng đúng hình học, thuật toán truy vấn 3D, ngưỡng và xác minh |
| R17 | Bóng đổ theo ngày/giờ/năm (3D B6) | **Có hiệu ứng ánh sáng/bóng**, chưa đạt phân tích chiếu sáng | Vị trí mặt trời theo thời gian/địa điểm, hình học và báo cáo phân tích |
| R18 | Mô phỏng ngập/thoát nước (3D F) | **Chưa**; mặt nước hiện là hiệu ứng thị giác | DTM, mạng thoát nước, điều kiện mưa/mực nước và mô hình chuyên ngành đã hiệu chỉnh |
| R19 | CAD/BIM, as-built, tiến độ (3D D/L) | **Chưa** | Nhập thiết kế, chuẩn tọa độ/ID, dữ liệu các kỳ và so sánh có ngưỡng sai số |
| R20 | Nguồn, thời điểm và QC (2D §1/6; 3D bảng nền/§6) | **Có phần truy xuất nguồn; QC đo đạc chưa có** | Checkpoint độc lập, sai số XY/Z, chất lượng từng lớp và phê duyệt chuyên môn |
| R21 | Báo cáo hiện trạng theo vùng (2D A9, D12) | **Một phần**: xuất ảnh và báo cáo kỹ thuật có sẵn | Báo cáo tự tạo theo polygon gồm đối tượng, con số, nguồn/ngày/sai số |
| R22 | Dùng chung dữ liệu và quản lý vòng đời (hai tài liệu phần giá trị/KPI) | **Một phần**: repo, dữ liệu local, mã tái sử dụng | Quy trình cập nhật/chia sẻ, phân quyền, dịch vụ dữ liệu và nhật ký nghiệp vụ phù hợp cơ quan |
| R23 | Chứng minh năng suất (2D §6; 3D §6) | **Chưa đo**; benchmark renderer không phải KPI nghiệp vụ | Baseline thao tác thủ công, thời gian trả lời, ngày công/chuyến khảo sát tránh được, mức dùng lại |

Phân quyền, dịch vụ dữ liệu và nhật ký ở R22 là yêu cầu vận hành tôi đề xuất để hiện thực hóa việc dùng chung; hai tài liệu chưa quy định chi tiết kiến trúc hoặc chuẩn an toàn cho chúng.

Không gộp các trạng thái trên thành “đã đạt X% Digital Twin”. Mục tiêu render, dữ liệu khảo sát và năng lực ra quyết định có giá trị và mức khó khác nhau.

## 4. Chuyển bối cảnh Gia Lộc sang TP.HCM như thế nào?

Giữ phương pháp hỏi và cấu trúc dữ liệu; thay địa bàn, phạm vi, bộ hồ sơ, tiêu chí và cơ quan sử dụng. Không đổi tên địa phương rồi giữ nguyên các số liệu/đối tượng Phước Đông.

| Tình huống trong tài liệu | Áp dụng phù hợp cho phạm vi HCMC đang làm | Điều kiện |
|---|---|---|
| Quy hoạch/GPMB hành lang đường | Vẽ một tuyến giả định, đổi bề rộng, xem các footprint giao hành lang và so sánh A/B/C | Trước mắt chỉ ước lượng trên dữ liệu mở; không suy số hộ, thửa hay tiền đền bù |
| Hiện trạng đô thị toàn phường | Khoanh ô phố Nguyễn Huệ–Bạch Đằng, thống kê khối/diện tích footprint và mức tin cậy | Xác định AOI, loại trùng parts, kiểm tra dữ liệu nền |
| KCN Phước Đông/PCCC nhà xưởng | Trong khu trung tâm ưu tiên công trình cao tầng, tiếp cận và không gian công cộng; bài toán KCN triển khai ở AOI công nghiệp khác | Hiện chưa có dữ liệu đo tĩnh không/PCCC, không kết luận khả năng cứu hộ |
| Kênh/ngập và san nền | Đánh giá ven sông/đường/điểm thấp trong một khu có DTM và mạng thoát nước | Không làm từ mặt phẳng hiện tại; không coi mặt nước render là kết quả thủy lực |
| Nông nghiệp và vườn cây | Với AOI hiện tại, chuyển ưu tiên sang cây đường phố/công viên; nông nghiệp giữ cho khu phù hợp về sau | Cây mô phỏng không dùng để đếm cây thật hoặc tính tán |
| As-built dự án | Theo dõi một công trình/tuyến chỉnh trang bằng dữ liệu các kỳ và thiết kế | Cần hồ sơ dự án và hình học đo, không suy tiến độ từ ảnh nhiều năm khác nhau |
| Tầm nhìn quy hoạch của City Lab | Lớp hiện trạng + các phương án/phân kỳ có nguồn, hồ sơ và trạng thái rõ ràng | “Sa bàn 100 năm” là mục tiêu của dự án HCMC, không phải yêu cầu đã định nghĩa trong hai Word |

## 5. Ưu tiên tiếp theo, không cần khởi động phần UAV

**Bước 1 — Chuẩn hóa nền khu mẫu.** Giữ khung City Lab và vùng Nguyễn Huệ–Bạch Đằng hiện có, nhưng chốt AOI, mã công trình/bộ phận, phiên bản, trạng thái nguồn và dữ liệu nào chỉ được dùng để minh họa. Xin/tiếp nhận dữ liệu hiện có có quyền sử dụng trước; chưa cần khởi động chiến dịch bay.

**Bước 2 — Làm một vòng hỏi–trả lời GIS hoàn chỉnh.** Ba trải nghiệm lãnh đạo: khoanh vùng → đếm/diện tích/danh sách; vẽ tuyến → buffer theo bề rộng → đối tượng giao cắt; đổi A/B/C → so sánh tác động và xuất báo cáo. Có thể phát triển bằng footprint đang có, nhưng kết quả phải ghi “ước lượng từ dữ liệu mở”, công bố cách loại trùng và phạm vi thiếu dữ liệu. Đây là chức năng mới cần xây, chưa có hiện nay.

**Bước 3 — Nhận một bộ dữ liệu chuẩn cho khu nhỏ.** Gói cần gồm ảnh trực giao, metadata, CRS/cao độ, ranh và điểm kiểm tra; nếu triển khai phân tích 3D thêm point cloud/DTM/DSM/mesh phù hợp. Không bắt buộc người dùng phải tự bay: có thể từ đơn vị quản lý/đối tác có quyền cung cấp. Kiểm tra sai số rồi mới mở các phép đo cần độ tin cậy.

**Bước 4 — Một use case 3D có thể nghiệm thu.** Chọn mặt cắt/cao độ hoặc khối lượng trên khu đã có dữ liệu; đối chiếu mẫu độc lập. Sau đó mới tiến tới ngập, clearance, as-built, vì các bài toán này còn phụ thuộc dữ liệu chuyên ngành.

**Bước 5 — Nối quy hoạch và đo hiệu quả.** Nhập một lớp quy hoạch/phương án thực có hồ sơ, phiên bản và trạng thái; đo thời gian từ câu hỏi đến báo cáo, số thao tác/ngày công so với cách cũ. Không tự tạo mốc phát triển hoặc hình khối tương lai để lấp chỗ hồ sơ còn thiếu.

Điểm có thể trình bày trung thực với lãnh đạo hiện nay: **“City Lab đã chứng minh trải nghiệm xem và đối chiếu nguồn trên bản đồ 3D khu trung tâm. Giai đoạn kế tiếp biến nền này thành công cụ truy vấn và so sánh phương án, rồi bổ sung dữ liệu đo kiểm để hỗ trợ quyết định kỹ thuật.”**

## Hồ sơ kiểm tra

- Hai bản trích toàn văn `.txt` lưu cùng thư mục, chỉ số [nnn] là thứ tự block XML, không phải số trang Word.
- [source-receipts.json](source-receipts.json): đường dẫn và SHA-256 hai bản gốc; không sửa Word đầu vào, không có hình nhúng hoặc tracked changes.
- [question-counts.json](question-counts.json), [question-inventory.csv](question-inventory.csv): kiểm đếm độc lập ngân hàng câu hỏi.
- Đọc code/runtime contracts và báo cáo đã có; không chạy lại toàn bộ UI/benchmark trong lượt phân tích tài liệu này. Không coi các thành phần dự kiến trong README/manifest là đã có dữ liệu thực.
