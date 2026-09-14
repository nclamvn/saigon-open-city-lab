# Completion — Batch 18

Đã hoàn tất phạm vi nguồn, streaming và LOD theo vùng cho City Lab TP.HCM. Chủ thầu áp dụng Vibecode với ba Thợ nguồn/GIS/UI và kiểm đầu ra bằng oracle, browser và hình ảnh trực tiếp. Yêu cầu thi công của người dùng là căn cứ triển khai; không có bước xin lại phê duyệt thiết kế.

## Kết quả có thể trải nghiệm

- **Khám phá → Ảnh & địa hình**: bật lớp Sentinel26/04/2026 trên DTM mô hình GEDTM v1.2, mở toàn vùng, di chuyển và chọn ID công trình.
- Bốn COG có source/QC/fingerprints, Worker đọc window/overview và kiểm HTTP206/ETag. 189 mảnh với378 GLB,70.709 biểu diễn công trình nguồn; chọn fine/coarse bằng camera dưới ngân sách32 mảnh/32MiB.
- Inspector20 ảnh thực có phóng ảnh gốc, thời điểm, credit/giấy phép và chuyển tới workflow mặt đứng3D trước đó. Đã tìm thêm hai nhóm ảnh Nhà hát Thành phố cùng ngày để điều tra reconstruction tiếp.
- UI kính giữ năm tác vụ, collapse/expand và alignment. Về nền hoặc mở phân tích sẽ khôi phục camera/ánh sáng/nguồn phù hợp; toàn cảnh demo vẫn mặc định ban ngày.

## Bằng chứng và giới hạn

12 kiểm thử nguồn, 18 kiểm thử Core18, 8 kiểm thử máy chủ đều PASS; buffer/mask COG trong trình duyệt khớp Rasterio, toàn bộ cao độ nền công trình khớp tính toán. 378/378 GLB qua Khronos không errors/warnings, 20/20 ảnh retained khớp bytes/dimensions. 24/24 kiểm tra UI và 4/4 kiểm tra lỗi dữ liệu trong trình duyệt PASS; cùng kiểm trực quan được tổng hợp trong [Verify](VERIFY.md).

Nguồn chính thức được ưu tiên và truy cập đến archive/resource thật. Các tài sản hiện tìm được chưa đủ geometry/quyền để tạo lớp quy hoạch vận hành; không dựng skyline tương lai từ suy đoán. Đợt này xây kiến trúc tiếp nhận và tải dữ liệu, chưa biến vệ tinh10m/terrain31m thành khảo sátcm. COPC/SfM/3DGS và quy hoạch giữ gate dữ liệu; scene cũ vẫn nạp startup.

## Tài liệu bàn giao

- [Kiến trúc, nguồn và bước tiếp](ARCHITECTURE-AND-SOURCES.md).
- [Demo/runbook18](../../outputs/DEMO-18-HUONG-DAN.md).
- Completion Thợ: [SOURCES](COMPLETION-SOURCES.md), [GIS18](COMPLETION-GIS18.md), [UI18](COMPLETION-UI.md).
- [Blueprint](BLUEPRINT.md), [quyết định](DECISIONS.md), [fingerprints](qa/release-fingerprints.json).

[Mở toàn cảnh ban ngày](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=overview) · [Mở lớp ảnh và địa hình](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=surface18). Máy chủ Range loopback8768 đang hoạt động. Bàn giao nguyên cấu trúc hcmc-poc + shared; không dùng HTML độc lập lịch sử. Không thực hiện commit/push hay xuất bản trong đợt này.
