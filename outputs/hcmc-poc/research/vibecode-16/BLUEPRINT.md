# Batch 16 — City Lab: giao diện lãnh đạo và nền chứng cứ

Ngày: 13/09/2026. Contractor: agent chính; Builder: leadership_ui, planning_sources, geometry_audit. Phương pháp: Vibecode Kit v6.1.

## RRI rút gọn từ yêu cầu đã xác nhận

| ID | Yêu cầu | Đầu ra / người phụ trách |
|---|---|---|
| REQ-01 | Màn hình bản đồ là chính, mặc định ban ngày | UI Builder |
| REQ-02 | Bốn tác vụ Khám phá, Quy hoạch, So sánh, Tham quan; thao tác đơn giản | UI Builder |
| REQ-03 | Hoãn UAV và thu gọn thông số kỹ thuật trong chế độ lãnh đạo | UI Builder |
| REQ-04 | Phân biệt thông tin nguồn, dự kiến và bản vẽ đủ điều kiện dựng | Sources Builder |
| REQ-05 | Không dựng quy hoạch hoặc mốc tương lai khi thiếu hồ sơ | Sources + UI Builder |
| REQ-06 | A/B thực trên mô hình hiện có, giữ camera, nhãn đúng bản chất | UI Builder |
| REQ-07 | Rà từng công trình trong 20 mục, nêu thiếu chứng cứ và thứ tự sửa | Geometry Builder |
| REQ-08 | Giữ tương thích PoC 15b, điều khiển và bản HTML đóng gói | UI Builder; Contractor nghiệm thu |

Đối tượng sử dụng: lãnh đạo không chuyên kỹ thuật. Phạm vi trước mắt: khu mẫu hiện có; không tuyên bố đã mô hình hóa chính xác toàn địa bàn TP.HCM sau thay đổi hành chính. Chưa có trọn bộ hồ sơ bản vẽ quy hoạch đã đối chiếu. Đây là điều kiện dữ liệu chưa đạt, không phải lựa chọn để hệ thống tự bổ sung hình học.

## Vision và thiết kế

Giữ engine Three.js và dữ liệu hiện có. Thêm lớp giao diện độc lập, không chuyển framework. Giao diện trình bày có bốn tác vụ, một bảng mở mỗi lần, nút trở về toàn cảnh, trạng thái hiện trạng gần đúng và nguồn theo yêu cầu. Chế độ nghiên cứu giữ các công cụ cũ. URL có view cụ thể vẫn được tôn trọng.

Quy hoạch hiển thị danh mục nguồn và trạng thái chờ hồ sơ. Không có bản vẽ hợp lệ thì không có lớp quy hoạch 3D, không thanh thời gian với mốc tự đặt. So sánh đợt này là mô hình nền với lớp ảnh tham chiếu hiện có, không gán tên hiện trạng–tương lai. Tham quan dùng các góc đã có với tiến/lùi/dừng do người dùng điều khiển.

Hợp đồng dữ liệu: `window.PLANNING_16`, version `16a`, verifiedAt, geometryReady false, sources gồm id/title/url/publisher/publishedAt/status/scope/allowedUse/limitations. Từng mục nêu nguồn có thể chứng minh điều gì, không suy tình trạng phê duyệt từ bài báo. Không có dữ liệu vẫn hiển thị trạng thái an toàn.

## Task graph

TIP-16-UI chạy song hành TIP-16-SOURCES và TIP-16-GEOMETRY-AUDIT. UI và Sources tích hợp qua hợp đồng trên; Geometry chỉ ghi báo cáo, không thay đổi hình học. Sau khi Builder nộp completion: Contractor đọc thay đổi, chạy kiểm tra phù hợp, xem trình duyệt, thử thao tác và phản hồi sửa nếu có lỗi. Chỉ đóng phiên bản sau khi xác nhận thực tế.

## Decisions log

- Gộp RRI/Vision/Blueprint; không hỏi lại các quyết định đã có trong lộ trình và yêu cầu “bắt tay triển khai”. Skill cho Contractor bỏ checkpoint theo judgment; đây là triển khai bổ sung có thể đảo ngược trong phạm vi đã được ủy quyền.
- Phân vai Contractor không viết mã triển khai; Builders thực hiện code và báo cáo theo TIP. Contractor phụ trách nguồn yêu cầu, điều phối, tài liệu và nghiệm thu.
- Chưa sửa hình học không có bằng chứng. Đợt này tạo kiểm kê để đợt sửa tiếp theo có đầu vào cụ thể.
- Không tự gửi công văn, xuất bản hoặc push Git. Bản xem trước và gói local nằm trong phạm vi đã ủy quyền.

## Điều kiện nghiệm thu

REQ-01..08 đều có bằng chứng hoặc ghi thiếu rõ trong VERIFY. Kiểm tra ứng dụng chạy, bốn tác vụ, đóng/mở không chồng, nguồn không bị nâng thành phê duyệt, A/B đúng đối tượng, bàn phím và không lỗi JS. Chạy validators mới và hồi quy có liên quan. Ghi rõ phần chưa kiểm tra trên màn hình/phần cứng thực tế và giới hạn hình học hiện có; không suy từ kiểm tra tĩnh rằng đã có mô hình chính xác.
