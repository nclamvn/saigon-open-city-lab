# TIP-16-SOURCES — Danh mục nguồn quy hoạch

- Vai trò: Builder planning_sources, Contractor /root. Ngày: 13/09/2026.
- Phụ thuộc: không. Ưu tiên P0 — ngăn dựng quy hoạch không có căn cứ.
- Phạm vi: data/planning-16.json và .js, hồ sơ nguồn research/vibecode-16, scripts/validate_planning_16.py. Không sửa UI hoặc mô hình.
- Bối cảnh: nguồn đồ họa hiện tại chủ yếu là khối tham chiếu và ảnh có niên đại khác nhau. Người dùng yêu cầu tầm nhìn quy hoạch tương lai có nguồn chuẩn, UAV hoãn.

## Task

Xác minh các trang HĐND và Sở Quy hoạch–Kiến trúc đã chỉ định; phân biệt cơ quan đăng, tác giả nguồn gốc, tin hoạt động, hồ sơ dự kiến và quyết định phê duyệt. Lưu URL, ngày đăng, ngày kiểm tra, phạm vi, mức được sử dụng và giới hạn; lưu HTML và SHA-256 nếu tải được, nếu không ghi metadata đọc được cùng lỗi. Tìm đầu mối GIS metro và bản vẽ công khai, không tự dựng hình học hoặc mốc tương lai từ bài báo.

## Acceptance criteria

- AC-S1: Given các trang nguồn công khai, when đọc danh mục, then ít nhất hai trang cơ quan chính thức đã được kiểm tra và mỗi bản ghi có provenance cùng giới hạn sử dụng.
- AC-S2: Given bài báo hoặc mục GIS dự kiến chưa đối chiếu bộ dữ liệu, when ứng dụng đọc registry, then geometryReady=false và không có đối tượng/giai đoạn quy hoạch tự tạo.
- AC-S3: Given bản JSON và JS, when chạy validator, then nội dung giống nhau, ngày hợp lệ, URL cơ quan chính thức và hash của tệp lưu khớp.
- AC-S4: Given phép thử sửa trạng thái thành sẵn sàng, thêm mốc năm hoặc xóa provenance, when validator chạy, then dữ liệu không hợp lệ bị từ chối.

## Constraints

Không suy luận công trình đã phê duyệt từ tin báo chí. Phạm vi hợp nhất không đồng nhất với khu mẫu trung tâm và quy hoạch cũ 2040/2060. Không gửi yêu cầu ra bên ngoài. Không khẳng định tải dữ liệu khi chỉ đọc được danh mục. Không thêm chức năng UAV.
