# Batch 25A — Flood data gate và registry chứng cứ

Ngày khóa dữ liệu: 2026-09-23
Phạm vi sản phẩm: toàn địa giới hành chính TP.HCM; Thảo Điền là lát cắt hiệu chỉnh đầu tiên.

## Kết quả đã triển khai

- Registry gồm 9 nguồn, 64 claim; mỗi claim giữ URL, thời điểm lấy, evidence span, tier và SHA-256 của bản chụp thô.
- Bốn họ kịch bản: hai sự kiện quan trắc Thảo Điền, một họ mưa thiết kế + triều, một kịch bản sàng lọc bằng dữ liệu công khai.
- Không có thanh kéo lượng mưa hay mực triều vô hạn. Kịch bản thực giữ cặp thời gian; kịch bản tổng hợp cần phương pháp xác suất đồng thời được duyệt.
- Mọi kịch bản hiện fail-closed vì còn thiếu ít nhất một trong các thành phần: biểu đồ mưa, đường quá trình triều, mốc cao độ, DTM mặt đất, mạng thoát nước hoặc ngưỡng cảnh báo được duyệt.
- Flood Lab 25A đã được gắn vào renderer 3D. Giao diện cho xem sự kiện, độ sâu quan trắc, nguồn và khoảng trống dữ liệu; nút chạy bị khóa nên không tạo lớp nước giả.

## Đánh giá dữ liệu địa hình hiện có

Mẫu trung tâm hiện có GEDTM v1.2 và Copernicus DEM GLO-30 trên bbox 106.6834–106.7396 / 10.7494–10.8086. Lưới hiệu dụng khoảng 31 m; GEDTM là mặt đất mô hình hóa, Copernicus là DSM. Cả hai chưa có checkpoint khảo sát, còn mẫu chỉ phủ khoảng 6 × 6 km và không phải toàn thành phố. Chúng phù hợp với thử pipeline và sàng lọc vùng; không phù hợp để công bố độ sâu theo phố.

## Chuỗi mô hình được khóa

1. **Forcing:** mưa trạm/IDF-DDF; triều Phú An–Nhà Bè cùng mốc cao độ; cặp sự kiện giữ thời gian.
2. **Địa hình–thoát nước:** DTM mặt đất 0,5–2 m cho vùng ưu tiên; cống, hố ga, cửa xả, bơm, van và trạng thái vận hành.
3. **Solver:** SWMM 1D cho mạng thoát nước; HEC-RAS 2D hoặc solver nước nông tương đương cho mặt đất; trao đổi tại inlet/manhole.
4. **Hiệu chỉnh:** Thảo Điền–Quốc Hương–Nguyễn Văn Hưởng–Trần Ngọc Diện bằng sự kiện độc lập, độ sâu và thời gian ngập quan trắc.
5. **Xuất bản:** depth/velocity/duration tiles có thời gian, confidence và data-quality; WebGPU chỉ trực quan hóa output solver.

## Cổng chất lượng

- `demo-proxy`: cho phép sàng lọc vùng, phải ghi “chưa hiệu chỉnh”.
- `district-calibration`: cần mưa/triều địa phương, DTM cải thiện, dấu ngập quan trắc và mẫu năng lực thoát nước.
- `engineering-calibration`: cần DTM khảo sát, đầy đủ asset thoát nước, vận hành bơm/van và các sự kiện độc lập để validation.

Không được dùng DSM như DTM, không nội suy IMERG thành mưa theo phố, không tự đặt năng lực cống, không gọi output chưa hiệu chỉnh là dự báo.

## Kiểm thử

- `node outputs/hcmc-poc/scripts/qa-flood-25a.cjs`: 5/5.
- Refinery auditor: idempotent, provenance, honest-null và disputed-value policy đạt.
- Bite suite: positive control và các bite CAPTURE_MISSING, SPAN_NOT_FOUND, SOURCED_ATTR, DISTRIBUTION_NO_DENOMINATOR, IDEMPOTENT, NO_INFERRED đều bắt đúng lỗi.
- HTTP runtime: trang, catalog và registry trả 200; catalog có 4 kịch bản, registry có 9 nguồn/64 claim.

## Bước 25B được phép bắt đầu

1. Thu toàn thành phố: ranh chính thức, DEM/DTM public dùng cho screening, lưu vực, sông rạch, mặt phủ và điểm ngập đã xác minh.
2. Xây tile pyramid cho overview; tách mesh tinh Thảo Điền, không tăng giả độ phân giải vật lý.
3. Kết nối chuỗi mưa–triều thực theo cùng timestamp/datum.
4. Chỉ sau khi nhận DTM và thoát nước đủ điều kiện mới chạy 1D/2D và bật lớp nước/độ sâu.
