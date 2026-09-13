# Lộ trình 3D Map và sa bàn quy hoạch cho lãnh đạo

Đề xuất ngày 13/09/2026. Chưa phải lịch/chi phí cam kết. UAV hoãn đến khi có yêu cầu mới. Đã bắt đầu batch 16 theo Vibecode: giao diện lãnh đạo, danh mục nguồn và kiểm kê hình học. Hồ sơ triển khai/kiểm tra ở `hcmc-poc/research/vibecode-16/`.

## Sản phẩm hướng tới

Bản đồ 3D chi tiết có căn cứ, kết hợp trình bày quy hoạch theo các giai đoạn có hồ sơ, phục vụ lãnh đạo xem tổng thể, khám phá khu vực, so sánh hiện trạng–quy hoạch và truy xuất nguồn bằng thao tác đơn giản. Sa bàn 100 năm là định hướng sản phẩm, không được tự diễn giải thành lịch xây dựng hoặc thiết kế cụ thể trong 100 năm.

## Các bước và điều kiện chuyển bước

1. **Chốt hồ sơ nguồn và phạm vi.** Danh mục từng lớp: cơ quan ban hành/cung cấp, văn bản hoặc bộ dữ liệu, phiên bản, ngày, địa bàn, hệ tọa độ/tỷ lệ, tình trạng phê duyệt và quyền sử dụng. Lập bảng thiếu dữ liệu. Hồ sơ quy hoạch gốc là căn cứ dựng hình; tin báo chí chỉ để phát hiện đầu mối. Không tự gửi yêu cầu dữ liệu ra ngoài khi chưa được ủy quyền.
2. **Kiểm tra lại nền 3D.** Sửa footprint, bộ phận, cao độ, mái, cầu, mặt đường, bờ sông và đối tượng trùng. Ưu tiên 20 công trình và khu Nguyễn Huệ–Bạch Đằng; 5 mặt đang giữ không phủ phải được chia mặt hoặc thay bằng hình học có căn cứ. Đối chiếu ảnh đa góc và hồ sơ; không nâng nhãn độ chính xác chỉ vì trông đẹp hơn. Phần thiếu nguồn tiếp tục là khối tham chiếu có nhãn.
3. **Hoàn thiện chất lượng hình ảnh của khu mẫu.** Thân/mái/ban công/cửa theo từng công trình; đường–vỉa hè–bó vỉa và cây bám vị trí có dữ liệu. Vật liệu đúng tỷ lệ, ánh sáng ban ngày trung tính, giảm nhấp nháy và răng cưa. Chi tiết không có bằng chứng không được trình bày như hiện trạng xác nhận. Giữ toàn khu vực ở mức tổng quát, mở rộng chi tiết từng cụm đã nghiệm thu.
4. **Gắn quy hoạch theo hồ sơ.** Hiện trạng và quy hoạch là hai lớp độc lập. Mỗi đối tượng có trạng thái đã phê duyệt/dự thảo, giai đoạn và tài liệu. Chỉ có ranh/chức năng đất thì thể hiện vùng và nhãn; chỉ dựng kiến trúc khi có thiết kế tương ứng. Không chuyển hình minh họa thành thiết kế đã xác nhận. So sánh các giai đoạn bằng cùng camera, ánh sáng và tỷ lệ; không tự thêm mốc năm.
5. **Thiết kế trải nghiệm lãnh đạo.** Màn hình mở ban ngày. Bốn tác vụ: Khám phá, Quy hoạch, So sánh, Tham quan. Lựa chọn địa danh bằng thẻ ảnh; chuyển camera chậm; có nút Về toàn cảnh và Hoàn tác. Thẻ thông tin ngắn, nguồn mở theo yêu cầu; trạng thái hiện trạng/quy hoạch/dự thảo luôn nhận biết được cả bằng chữ và màu. Không hiện mã PoC, thông số GPU hoặc danh sách lớp kỹ thuật trong chế độ trình bày.
6. **Tổng duyệt và đóng phiên bản trình.** Người phụ trách quy hoạch đối chiếu nội dung, chuyên môn địa lý/kiến trúc rà hình học. Người không chuyên thử thao tác. Đo hiệu năng trên máy/màn hình thực tế, kiểm phông chữ, điều khiển và chạy dài buổi trình; chạy offline, có bản dự phòng và ảnh/phim dự phòng. Nghiệm thu theo các tiêu chí đã thống nhất, không chỉ theo số lượng công trình hoặc độ đẹp.

## Hành trình đề xuất, khoảng 5 phút

- Mở toàn cảnh có tên khu vực và ngày dữ liệu; chọn Khám phá.
- Đi vào 3–5 điểm tiêu biểu đã được kiểm tra, xem đủ gần để nhận diện kiến trúc.
- Chọn Quy hoạch và một giai đoạn có hồ sơ; chỉ những thay đổi có căn cứ xuất hiện.
- Chọn So sánh tại cùng góc nhìn; bấm một thay đổi để đọc ý nghĩa và tài liệu gốc.
- Trở về toàn cảnh, mở bản đồ cấu trúc phát triển và các liên kết vùng có hồ sơ.

Các mốc thời gian trình diễn trên chỉ là kịch bản trải nghiệm, không phải mốc quy hoạch.

## Đầu mối nguồn đã kiểm tra

- HĐND TP.HCM, 09/09/2026: công tác lập Quy hoạch tổng thể 2025–2050, tầm nhìn 100 năm đang hoàn thiện. Không coi thông tin này là quyết định phê duyệt.
  https://hdnd.hochiminhcity.gov.vn/tin-tuc/ban-do-thi/ban-do-thi-hdnd-thanh-pho-khao-sat-cong-tac-lap-quy-hoach-tong-thethanh-pho-ho-chi-minh-tam-nhin-100-nam
- Mục tài liệu họp Sở QH-KT có đầu mối mạng lưới đường sắt đô thị **dự kiến** trên GIS. Chưa nhập/tải và kiểm chứng dữ liệu lớp này; chỉ là đầu mối thu thập.
  https://qhkt.hochiminhcity.gov.vn/tai-lieu-hop.html
- Mục tin Sở QH-KT đăng đầu mối hướng dẫn kỹ thuật xây dựng và ứng dụng bản sao số đô thị. Cần đọc đầy đủ văn bản gốc trước khi tuyên bố tuân thủ; đợt này mới nhận diện đầu mối.
  https://www.qhkt.hochiminhcity.gov.vn/tin-moi-nhat.html

## Bắt đầu đợt tiếp theo

Thực hiện bước 1 và 2 song hành: dựng danh mục hồ sơ có thể nhập + rà lại khu mẫu; đồng thời phác giao diện 4 tác vụ để tránh tiếp tục tích lũy menu PoC. Chỉ bắt đầu dựng phương án quy hoạch khi nội dung hồ sơ nguồn đã được đối chiếu. Đợt hiện tại chưa thu được trọn bộ hồ sơ quy hoạch chính thức.
