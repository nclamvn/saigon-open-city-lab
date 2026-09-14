# Quyết định kỹ thuật đợt 18

- **D18-01 — thi công được cho phép:** yêu cầu triển khai của người dùng là căn cứ tiến hành; không xin lại gate thiết kế. Không xuất bản hay thực hiện thao tác UAV.
- **D18-02 — tính toàn vẹn streaming:** SHA256 toàn bản crop được kiểm offline; máy chủ tính strong ETag từ bytes thực; Worker kiểm ETag, tổng bytes và nội dung Range. Đây là ràng buộc phiên bản transport, không là hash toàn tệp trong browser hoặc bằng chứng từng block độc lập.
- **D18-03 — migration có thể kiểm chứng:** giữ Three r128, thêm biểu diễn surface opt-in. Cảnh cũ vẫn nạp vào bộ nhớ và có thể khôi phục. Ngân sách lớp mới không được gọi là đã giảm startup toàn ứng dụng.
- **D18-04 — phân biệt loại cao độ:** ground là DTM mô hình, DSM chỉ là bề mặt riêng. Trừ mốc ground ở tâm map để hiển thị; không tuyên bố đã chuyển sang cao độ ellipsoid hoặc hệ trắc địa địa phương. Nền, khối nhà và overlay phải dùng cùng sampler.
- **D18-05 — ảnh thực theo đúng khả năng:** 20 ảnh tham chiếu có vị trí, credit và quyền theo từng tệp; ảnh đơn lẻ/khác thời điểm không được gọi là bộ SfM/3DGS. Cận cảnh gồm inspector ảnh 2D ở kích thước nguồn và đường tới workflow mặt đứng thực đã có.
- **D18-06 — API chính thức không đồng nghĩa quyền dữ liệu:** trang/danh mục, endpoint tìm thấy trong bundle công khai, phản hồi service và quyền tái sử dụng là các bằng chứng khác nhau. Chỉ dữ liệu được tiếp nhận, có quyền và qua QC được đưa vào lớp vận hành.
- **D18-07 — LOD hiển thị:** fine/coarse là polygon extrusion/bounding-box proxy cùng ID nguồn. Chúng không phải CityGML LoD2/3 hoặc khảo sát chi tiết. 3D Tiles JSON/glTF được xuất theo subset rõ ràng; adapter nội bộ chưa là viewer chuẩn đầy đủ.
- **D18-08 — trục chuẩn:** tileset ENU, root ENU→ECEF; glTF Y-up East-Up-South được chuyển Rx(+π/2) theo chuẩn. Catalog nội bộ giữ East-Up-South; có kiểm số độc lập bằng PROJ và kiểm file GLB thực.
- **D18-09 — phục hồi phân tích:** Batch17 vẫn phân tích hình học chuẩn trên renderer nền phẳng. Mở phân tích khi ở surface sẽ khôi phục biểu diễn nền trước, không phủ kết quả phẳng lên một trường cao độ khác.
- **D18-10 — compiler và runtime khác nhau:** crop/reprojection/COG và sản xuất GLB chạy offline; browser chỉ đọc và dựng vùng cần xem. Không tải raster toàn cầu hoặc inference AI nặng trên render thread.
- **D18-11 — giữ bản nguồn đã kiểm:** giữ block COG 512 pixel trong đợt này, ghi overhead của cửa sổ nhỏ. Tối ưu block size cần workload/benchmark và phiên bản source mới, không thay bytes đã kiểm chỉ để cải thiện một số đo.
- **D18-12 — dọn đầu ra phát sinh:** chỉ dọn 1.512 GLB/sidecar do các lượt build thử đợt này tạo, không được catalog hiện hành tham chiếu, sau khi kiểm các tài sản được giữ. Không xóa dữ liệu gốc, quarantine, snapshots hay các đợt lịch sử.
- **D18-13 — snapshot theo tham chiếu:** lượt kiểm cuối dọn thêm 323 bản sao không tham chiếu có tên “ 2”; không đọc bytes bản sao đang treo hoặc thay nguồn vận hành. Hash bàn giao lấy từ allowlist manifest/catalog thay vì quét mọi tệp trong thư mục; còn đúng 758 tài sản tiles hiện hành.

Các quyết định trên được nghiệm thu bằng Verify và QA, không suy từ việc đã có nút hoặc tên công nghệ trên giao diện.
