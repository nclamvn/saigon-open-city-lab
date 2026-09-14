# Batch 07 — Ô mẫu Gia Lộc 250 × 250 m

Batch 07 được tích hợp vào bản đồ Batch 04 hiện hành. Điểm quan sát là cụm quanh `msft_0615`, với 52 công trình có tâm trong ô mẫu. Có 57 footprint giao ô; 5 công trình chỉ giao biên được giữ ở lớp bối cảnh để tránh dựng trùng. Đây là vùng nghiên cứu kỹ thuật, không phải ranh hành chính chính thức của phường Gia Lộc.

## Trải nghiệm

- [Mở ô chi tiết](http://127.0.0.1:8768/tayninh-data-batch-04/?v=s07-final&focus=cluster).
- Chọn **A · mô hình cơ bản / B · chi tiết mô phỏng** để đối chiếu cùng góc nhìn.
- Chạm công trình để xem nguồn footprint, cách đặt chiều cao, thời gian và giới hạn dữ liệu.
- **Cách hiển thị** cho phép đổi GEDTM/COPDEM, tỷ lệ chiều đứng và mô hình chiều cao.
- Kéo để xoay, cuộn để zoom, phím mũi tên để dịch chuyển, Q/E để xoay, R để đặt lại góc nhìn, H để ẩn giao diện.
- Mở **Nguồn ảnh và trạng thái** để đọc hồ sơ tìm ảnh. Trên màn hình nhỏ, mở rộng bảng phân tích để xem hồ sơ và bộ kiểm tra dữ liệu.

Server local cần chạy tại cổng 8768 với thư mục `outputs` làm gốc. Tệp `file://` không thay thế server vì Worker và các nguồn JSON cần HTTP.

## Đã bổ sung

Vật liệu ảnh miễn phí CC0 từ ambientCG cho mái ngói, vữa, gạch và asphalt; mỗi loại có albedo, normal và roughness. Runtime dùng 12 map tối đa 1024 px, ước tính 56 MiB RGBA8 với mipmap, trong ngân sách 64 MiB. Gạch giữ tỷ lệ ảnh 1024 × 512. UV tính theo mét; kích thước lát vữa/gạch là lựa chọn mô phỏng khi nhà cung cấp không công bố kích thước vật lý.

Ô mẫu có cửa sổ, khung, bậu, mép mái, đường mái và các kiểu mái mô phỏng. Cây đồ họa bổ sung thân, nhánh và cụm lá có LOD; vị trí vẫn dựa trên mask/exclusion S06, không phải kiểm kê từng cây. Lớp ETH tán cây phục vụ phân tích vẫn tách biệt.

Bộ nạp ô dựng chi tiết theo camera, giới hạn cache 4 ô, giữ lớp công trình cơ bản làm dự phòng. Web Worker phân ô và chuẩn hóa descriptor; có kiểm tra stale request, lỗi khởi động, timeout và fallback đồng bộ. Đây là phân ô nội bộ, chưa phải bộ phát hành OGC 3D Tiles đầy đủ.

Bộ kiểm tra nguồn tương lai có đường chạy thật cho JSON metadata raster/georegistration, GeoJSON Polygon đơn và GLB mesh subset có SHA-256 từ byte tệp. Bộ này chỉ kiểm tra, chưa xuất bản dữ liệu vào cảnh. Chưa giải mã GeoTIFF/LAS; nguồn hình học phức tạp ngoài subset được từ chối rõ ràng.

## Ranh giới dữ liệu

Registry có **20 công trình mục tiêu, 0 ảnh mặt đứng đã xác minh**. Các truy vấn Commons/KartaView và nguồn tham khảo được lưu thành biên nhận; thiếu ảnh/GPS/quyền vẫn giữ pending. Kết quả tìm kiếm có phạm vi, không chứng minh toàn Internet không có dữ liệu tốt hơn.

Ảnh nền quan sát giữ nguyên Sentinel-2 ngày 30/11/2025, crop 330 × 334 px, độ phân giải 10 m. Vật liệu PBR giúp đồ họa nhà rõ hơn nhưng không phục hồi chi tiết thực dưới 10 m của ảnh nền. Không dùng ảnh AI/super-resolution làm số liệu khảo sát.

657 footprint nguồn vẫn có chiều cao đo thực null. 482 công trình đủ hỗ trợ mô hình Google; các công trình còn lại dùng ước tính. Trong miền mesh terrain hiển thị 656/657 footprint, 1 nằm ngoài miền pixel-center. GEDTM là địa hình dự đoán lớp 30 m thử nghiệm; COPDEM là DSM. Chưa có LiDAR, true ortho 1 cm, địa chính, nhận diện cây cá thể hay mô hình ngập đã hiệu chỉnh.

## Hồ sơ kiểm tra

- [Blueprint](governance/BLUEPRINT-S07.md)
- [Completion dữ liệu](governance/COMPLETION-S07-DATA.md)
- [Completion vật liệu/hình học](governance/COMPLETION-S07-SURFACE.md)
- [Completion engine/UI](governance/COMPLETION-S07-ENGINE.md)
- [Audit importer độc lập](governance/COMPLETION-S07-IMPORTAUDIT.md)
- [Audit Worker/cache độc lập](governance/COMPLETION-S07-WORKERAUDIT.md)
- [Verify của Contractor](governance/VERIFY-S07.md)

Các bước tiếp theo nên ưu tiên ảnh/orthophoto tốt hơn đúng vùng mẫu và mặt đứng có quyền sử dụng; cấu trúc source/provenance hiện tại cho phép thay nguồn quan sát khi có dữ liệu tốt hơn mà không thay đổi ý nghĩa của lớp mô phỏng.
