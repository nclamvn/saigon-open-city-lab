# C05 LOCAL — Nguồn ảnh và dữ liệu địa phương cho vùng mẫu Gia Lộc

Kiểm tra ngày 14/09/2026. Phạm vi là nguồn công khai được kiểm tra trong đợt này; không phải khẳng định đã kiểm kê toàn bộ dữ liệu trên Internet hoặc trong cơ quan nhà nước.

**Chưa thu được raster ảnh độ phân giải cao, LiDAR, mesh hay bộ mặt đứng có quyền sử dụng rõ ràng và phạm vi giao vùng mẫu đã kiểm chứng.** Đã tải các PDF hành chính/danh mục viễn thám, CSV nhật ký biến động bản đồ và một ảnh cửa hàng gốc có giấy phép mở. Ảnh cửa hàng đúng tên địa phương nhưng thiếu tọa độ để gắn vào công trình; không được tính là ảnh trực giao hoặc mặt đứng đã định vị.

## 1. Địa phương và phạm vi không thay đổi

[Nghị quyết 1682/NQ-UBTVQH15](https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2025/6/45138/56874-1-2025805-8061682-nq-ubtvqh15.pdf), Điều 1 khoản 96, trang in 45/PDF trang 8 xác nhận phường Gia Lộc mới thuộc Tây Ninh được hình thành từ phường Gia Lộc và xã Phước Đông, huyện Gò Dầu. Đây không phải Gia Lộc, Hải Dương. Bản lưu `evidence/local/nq1682.raw`; phần trích xuất `nq1682.txt` dòng 287–288.

Giữ nguyên bbox WGS84 `[106.3276338,11.0830401,106.3576338,11.1130401]`, tâm `[106.3426338,11.0980401]`. Đây là vùng mẫu kỹ thuật, **không phải ranh hành chính chính thức**. Nghị quyết xác nhận tên và cấu thành địa phương, không cung cấp polygon để kết luận toàn bộ vùng mẫu nằm trong phường. Không chuyển AOI sang một nơi khác để khớp dữ liệu dễ tải hơn.

## 2. Đầu mối có bằng chứng mạnh nhất

| Nguồn | Đã kiểm tra thực tế | Giá trị và giới hạn |
|---|---|---|
| [Cục Viễn thám quốc gia — báo cáo tháng 4/2026](https://nrsd.mae.gov.vn/noidung/Lists/ListTinTuc/Attachments/2873/Baocaocongbosieudulieuvienthamthuongxuyen_thang4.pdf) | Tải PDF báo cáo 22/BC-VTQG ngày 06/05/2026; phụ lục 2 trang 9 có ICR_SP_169737, vùng Nam Bộ–Tây Ninh | Đầu mối cụ thể để xin scene ID/footprint. Chưa có raster hay giao cắt AOI được xác nhận. |
| [Cổng Gia Lộc — bản đồ địa giới](https://gialoc.tayninh.gov.vn/ban-do-dia-gioi-hanh-chinh) | HTTP 200, lưu trang chuyên mục; chưa tìm được tệp ranh hoặc dịch vụ GIS từ HTML | Chủ quản đúng địa phương; trang chuyên mục không thay thế ranh số. |
| [CKAN Tây Ninh](https://data.tayninh.gov.vn/api/3/action/package_search?q=ban%20do&rows=100) | Truy vấn “ban do” trả 5 kết quả; tải CSV “Biến động bản đồ” 1.000 dòng, 15 cột | CSV không có tọa độ, geometry, raster; license_id trống và phạm vi chưa giải mã được. Không nhập vào scene. |
| [Quy Hoạch Trảng Bàng](https://apps.apple.com/vn/app/quy-ho%E1%BA%A1ch-tr%E1%BA%A3ng-b%C3%A0ng/id6702014096) | App Store của nhà phát triển VNPT; mô tả tra cứu quy hoạch/kế hoạch sử dụng đất; ứng dụng miễn phí | Chưa cài/đăng nhập/kiểm tra bản đồ. Miễn phí ứng dụng không chứng minh quyền xuất lớp ảnh hay chia sẻ dữ liệu. |
| [DOSM/VNSDI](https://dosm.vnsdi.gov.vn/) | Trang ứng dụng tải được; REST và tìm kiếm public trả HTTP 500 | Chưa xác nhận độ phân giải, phạm vi hay quyền export của lớp nền. Không dùng token, không bỏ TLS. |
| [TEDI South BIM–GIS](https://gis.tedisouth.vn/) | Hub có liên kết Tây Ninh; nhánh `/tayninh/` trả HTTP 502 | Chưa biết dự án có trùng Gia Lộc hay ai nắm quyền dữ liệu khảo sát. Không coi mô tả BIM/3DTiles là model đã nhận. |

Đối với đầu mối NRSD, khoảng 1/4–31/5/2026 là **lịch đặt chụp**, không phải ngày thu ảnh. Thông số 1,5 m là độ phân giải danh định PAN của SPOT6/7; đa phổ 6 m. Chưa biết mây, chất lượng ortho hay ngày chụp tại AOI. Danh mục công khai và lời mời khai thác không phải giấy phép miễn phí cho ảnh gốc. Cổng [catalogue ảnh](https://dulieuvientham.gov.vn/web/vien-tham/du-lieu-anh-vien-tham) trả HTTP 403 trong phép thử này. Nên xin metadata trước xin payload.

## 3. Ảnh mặt đất và cây/công trình

[Ảnh Commons “biển hiệu cửa hàng ở phường Gia Lộc, Trảng Bàng”](https://commons.wikimedia.org/wiki/File:T%C3%A2y_Ninh_2022_(bi%E1%BB%83n_hi%E1%BB%87u_c%E1%BB%ADa_h%C3%A0ng_%E1%BB%9F_p_Gia_L%E1%BB%99c,_Tx_Tr%E1%BA%A3ng_B%C3%A0ng).jpg), tác giả Phương Huy, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0), đã tải bản gốc JPEG3024×3481, 2.591.343byte. Đã xem ảnh: biển hiệu ghi khu phố Tân Lộc, phường Gia Lộc; mặt tiền chụp xiên, cắt khung và bị che khuất. EXIF DateTimeOriginal=17/09/2022 11:37:48; không có GPS IFD. DateTime sửa tệp=18/09/2022 là trường khác. Lưu tại `evidence/local/commons-gialoc-photo.jpg`, SHA256 trong registry. Không gắn ảnh vào một căn nhà trong vùng mẫu khi chưa định vị độc lập; phải giữ ghi công và giấy phép khi sử dụng.

Phép [geosearch Commons bán kính 2.500 m](https://commons.wikimedia.org/w/api.php?action=query&format=json&list=geosearch&gscoord=11.0980401%7C106.3426338&gsradius=2500&gsnamespace=6&gslimit=100) trả mảng rỗng. Đây chỉ là kết quả tìm ảnh đã gắn geotag, không chứng minh không có ảnh khu vực. [Mapillary](https://www.mapillary.com/developer/api-documentation/) mới kiểm tra trang tài liệu. Với KartaView, Contractor đã thử public endpoint từ [mã nguồn chính thức](https://github.com/kartaview/mcp-karta-view): tâmAOI, radius500m, limit100; HTTP200/api601,resultnull. LOCAL lưu và kiểm hash response. Phép thửbbox cũng rỗng nhưng chưa xác minh runtime áp dụng tham sốbbox, nên không dùng làm kết luận toànAOI không cóảnh. Chưa có asset từ hai dịch vụ để sử dụng.

Không tìm được bộ LiDAR/point cloud, cao độ mái hoặc ảnh hàng không địa phương đủ điều kiện trong các nguồn đã kiểm tra. Loại khỏi danh sách dùng cho AOI: nguồn chỉ trùng tên Gia Lộc ở tỉnh khác; LiDAR/TrueOrtho của TP.HCM mà không có footprint chứng minh giao AOI; quảng cáo dịch vụ; ảnh chụp màn hình bản đồ; tin dự án không kèm dữ liệu và quyền dùng.

## 4. Bước lấy dữ liệu đề nghị, chưa gửi liên hệ

1. **Cục/Đài Viễn thám quốc gia:** đề nghị danh mục scene giao đúng bbox, ưu tiên đầu mối ICR_SP_169737; yêu cầu footprint, ngày thu, mây trong AOI, PAN/MS, góc chụp, mức xử lý, CRS, quyền hiển thị/biến đổi/tái phân phối và phí nếu có. Chỉ nhận định đủ điều kiện khi các trường này được xác nhận.
2. **Đơn vị quản lý đất đai và bản đồ tỉnh Tây Ninh/phường Gia Lộc:** đề nghị kiểm kê ảnh trực giao hiện trạng, dữ liệu đo đạc đã nghiệm thu, ranh hành chính, footprint nhà, DSM/DTM/cao độ mái nếu đang giữ; xin metadata và khu vực phủ trước. Đây là danh mục cần hỏi, không khẳng định cơ quan có đủ các lớp.
3. **Chủ quản dữ liệu quy hoạch Trảng Bàng/VNPT và tư vấn dự án:** xác nhận file nguồn, cơ quan phê duyệt, ngày hiệu lực và quyền xuất. Tách bản đồ quy hoạch khỏi ảnh hiện trạng; không dùng hình khối quy hoạch làm công trình đã xây.
4. **Ảnh mặt đất được phép sử dụng:** kiểm chứng đúng địa chỉ trước dựng từng mặt đứng; nếu dữ liệu mở thiếu thì lập danh sách điểm cần bổ sung ảnh đã được chủ sở hữu cấp quyền. Không lấp chỗ thiếu bằng ảnh ngẫu nhiên của địa điểm khác.

Chưa gửi thư, tin nhắn hoặc yêu cầu dữ liệu tới bất kỳ tổ chức nào. Không đặt mua, đăng ký tài khoản, sử dụng token hay tự chấp thuận điều khoản.

## 5. Hồ sơ kiểm chứng và hạn chế

- `research/local-sources.json`: 10 bản ghi; tách `access_status`, `coverage_status`, `license_status`, `free_export_status`; các bbox asset chưa xác minh để `null`.
- `evidence/local/receipts.json`: 29 biên nhận/snapshot, hash SHA256 và số byte; gồm phản hồi/source KartaView do Contractor cung cấp và đã kiểm tra độc lập nội dung. Thời điểm `captured_at` theo mtime lúc lưu tệp; ngày tài liệu/ảnh là trường riêng.
- HTTP 502/500/403 được lưu nguyên response; lỗi TLS lưu ghi nhận riêng. Trang Quốc hội trả HTTP 200 nhưng chỉ là challenge shell, không dùng làm bằng chứng nội dung; thay bằng PDF Công báo.
- Các tệp HTML/JS là bằng chứng truy cập, không phải quyền khai thác dữ liệu. Không đưa endpoint nội bộ/token vào sản phẩm.
- Kiểm tra bằng `python3 evidence/local/build_receipts.py` từ thư mục chiến dịch hoặc đường dẫn đầy đủ: 29 hash hợp lệ, 10 bản ghi đủ trường, AOI không thay đổi. Một ảnh tham chiếu đã lấy, chưa có asset ảnh địa phương đạt đồng thời ba điều kiện quyền dùng + chất lượng + phạm vi phủ.
