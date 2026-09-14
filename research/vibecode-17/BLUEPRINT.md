# RtR Digital Twin Core — đợt 17

Ngày: 14/09/2026. Vai trò: Chủ thầu thiết kế và kiểm chứng; ba Thợ xây nguồn dữ liệu, GIS và giao diện. Đích triển khai: City Lab TP.HCM hiện hữu, không tạo ứng dụng demo tách rời.

## Căn cứ và quyết định

Người dùng yêu cầu xây lõi chung chuẩn từ các nguồn có thể tiếp cận, áp dụng vào TP.HCM, ưu tiên khoa học, dữ liệu có nguồn, tương tác cho lãnh đạo. Hai tài liệu Gia Lộc được đối chiếu trong `outputs/review-gia-loc/recheck-s07/`; 237 câu hỏi không phải 237 chức năng đã đạt. Đợt này tạo một phần lõi có thể vận hành và kiểm thử, không tự nhận hoàn thành toàn bộ hồ sơ Digital Twin.

SCAN: ứng dụng static Three.js r128; CITY_DATA lưu mặt bằng mét cục bộ, x Đông/z Nam, nền phẳng; có 70.719 biểu diễn khối bao gồm bộ phận minh họa; chưa có địa hình đo kiểm hoặc hình học quy hoạch được duyệt. Phần GIS quản lý khoanh vùng/hành lang/xuất kết quả còn thiếu. Gia Lộc đã có xử lý raster và LOD theo vùng nhưng dùng trục z Bắc. Không ghép hai frame trực tiếp.

D01: dùng adapter địa phương + lõi độc lập engine, dữ liệu chuẩn GeoJSON WGS84 ở ranh giới giữa các module. Frame hiển thị không phải CRS đo đạc. Không gán VN-2000 hoặc độ chính xác centimet cho dữ liệu cũ.

D02: dùng thuật toán thư viện có giấy phép, pin phiên bản, vendored, kiểm hình học; GIS chạy Worker với chỉ mục không gian, request mới loại kết quả cũ. Không chọn đối tượng bằng tâm nhà thay cho giao hình học.

D03: phân biệt biểu diễn khối, ID nguồn và nhà/thửa thực tế. Không gộp OSM/Overture theo phỏng đoán; không tính bộ phận dựng minh họa như công trình độc lập. Diện tích giao cộng và diện tích hợp không trùng phải mang nhãn riêng.

D04: mỗi nguồn có trạng thái tiếp cận, quyền sử dụng, epoch, CRS, độ phân giải gốc và hash tệp đã thu thập. Ngày phát hành khác ngày chụp; pixel nội suy khác độ phân giải hiệu dụng. Nguồn đang là đầu mối tìm kiếm không trở thành lớp dữ liệu chỉ nhờ có URL.

D05: so sánh A/B/C là các khoảng hành lang do người dùng thử; không phải ba phương án quy hoạch đã duyệt. Chưa bật thể tích đào đắp/ngập/LOS từ nền phẳng.

D06: giữ engine và ảnh mặt đứng hiện có; thêm plugin Phân tích trong cùng rail kính đồng nhất. Mặc định tổng quan ban ngày. Các công cụ khảo sát UAV tiếp tục dành cho phase sau.

D07 — checkpoint: người dùng đã chỉ định triển khai đề xuất. Theo quyền co giãn checkpoint trong Vibecode Kit, không lặp lại yêu cầu APPROVED/CONFIRM cho thay đổi cục bộ có thể đảo ngược; ghi nhận quyết định này trước khi thi công. Bản hoàn thành phải có TIP, Completion và Verify thực tế.

## Kiến trúc

```text
Nguồn gốc + tệp/hash + quyền + chất lượng
                ↓
Project config / SourceCore / adapter địa phương
                ↓ GeoJSON + provenance + loại hình học
GIS kernel + spatial index / Worker / lifecycle request
                ↓ polygon, buffer, giao/hợp, thống kê A/B/C
Bridge engine hiện hữu / rail kính / export báo cáo
```

Lõi ở `outputs/shared/digital-twin-core/`; City Lab chỉ phụ trách hiển thị, camera và tương tác. Cấu hình TP.HCM/Gia Lộc ở `projects/`. Việc bổ sung nguồn tương lai phải qua quyền, CRS, đơn vị, thời gian, hash và điều kiện chất lượng trước khi mở năng lực phân tích tương ứng. COG, COPC, 3D Tiles 1.1, CityGML/CityJSON, STAC và 3DGS là các hướng đầu vào/streaming/semantics có nghiên cứu nguồn chuẩn; chỉ nhận là đã triển khai khi có decoder/service và kiểm tương thích thực tế.

## Yêu cầu nghiệm thu riêng đợt 17

| ID | Yêu cầu | Thợ | Ưu tiên |
|---|---|---|---|
| R17-01 | Lõi không hardcode địa phương; cấu hình TP.HCM và Gia Lộc, trục và phép đổi tọa độ được kiểm | Nguồn | P0 |
| R17-02 | Chuẩn nguồn giữ epoch/quyền/hash/resolution/trạng thái; phân biệt acquired và lead | Nguồn | P0 |
| R17-03 | Gate chặn suy diễn dữ liệu mô hình thành đo kiểm/quy hoạch duyệt | Nguồn | P0 |
| R17-04 | Chuẩn hóa dữ liệu HCMC hiện tại và giữ ID/chiều cao/nguồn/biểu diễn minh họa | Nguồn | P0 |
| R17-05 | Khoanh Polygon và tuyến LineString thực tế, kiểm hình học sai và ngoài vùng dữ liệu | GIS/UI | P0 |
| R17-06 | Giao hình học có lỗ/khối lõm; không bỏ đối tượng chỉ vì tâm nằm ngoài | GIS | P0 |
| R17-07 | Hành lang mét, so sánh A/B/C, nêu rõ đây là giả thiết phân tích | GIS/UI | P0 |
| R17-08 | Thống kê biểu diễn/ID nguồn, diện tích giao và hợp; không đếm minh họa là nhà | GIS/UI | P0 |
| R17-09 | Worker/chỉ mục; timeout/error/cancel và chống kết quả cũ ghi đè | GIS | P0 |
| R17-10 | Highlight kết quả trên bản đồ 3D, chuyển A/B/C giữ camera | UI | P0 |
| R17-11 | Rail/drawer kính đồng nhất, collapse, responsive và điều khiển bàn phím không xung đột | UI | P0 |
| R17-12 | Xuất kết quả có geometry/nguồn/epoch/hash/phương pháp/giới hạn, dữ liệu xuất an toàn | UI | P0 |
| R17-13 | Regression tổng quan ban ngày, cảnh đêm, mặt đứng, navigation và panel cũ | UI/Chủ thầu | P0 |
| R17-14 | Nghiên cứu chuẩn từ nguồn sơ cấp, tách đã xây/hướng tiếp theo; tài liệu vận hành lõi | Nguồn/Chủ thầu | P0 |
| R17-15 | Kiểm thuật toán bằng fixture độc lập và đối chiếu kết quả trên dữ liệu HCMC thật | GIS/Chủ thầu | P0 |
| R17-16 | Render → screenshot → nhìn → sửa; báo cáo nghiệm thu số kiểm cụ thể và giới hạn | UI/Chủ thầu | P0 |

Đồ thị: TIP-SOURCES và TIP-GIS cùng xây theo hợp đồng; TIP-UI xây tương tác độc lập rồi tích hợp khi API có. Chủ thầu nghiên cứu, rà soát và QA trong lúc thi công. Mỗi Thợ sở hữu tệp riêng, không sửa dữ liệu gốc hay viết đè lịch sử PoC.

## Hợp đồng module

`RTRTwin.SourceCore.normalizeScene(sceneData, config)` trả `{features,sources,frame,project,gates,normalization}`. Feature geometry WGS84; properties gồm `id,sourceId,sourceKey,modelIndex,name,classification,height`. `height.surveyed` không được tự bật từ chiều cao dựng. `inverseLocal/forwardLocal` dùng frame tường minh.

`new RTRTwin.AnalysisClient({workerUrl,config})`; UI dùng `await init({type:'rtr-raw-json/1.0',bytes:ArrayBuffer})` để Worker kiểm SHA-256 và parse JSON; `init(sceneData)` cũ được giữ nhưng ghi unverified; `query({geometry,mode,distances})`; `cancel()` và `destroy()`. Mode area hoặc corridor. Kết quả có `query`, `scenarios`, `provenance`, `limitations`, `timing`; scenario có geometry, FeatureCollection và summary. Đơn vị area m², length/buffer m; phương pháp xấp xỉ địa lý phải được khai báo, không phải chất lượng khảo sát.

Giao diện đọc cấu hình `/shared/digital-twin-core/projects/hcmc.json`. Mẫu hành lang Nguyễn Huệ lấy tọa độ tuyến được ánh xạ trong CITY_DATA; vùng mẫu là AOI người dùng thử, không gắn nhãn ranh pháp lý. Probe DOM `#twin17Probe` phục vụ kiểm thử trạng thái thực hiển thị.
