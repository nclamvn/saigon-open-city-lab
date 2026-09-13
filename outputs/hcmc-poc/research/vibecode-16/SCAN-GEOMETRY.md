# Kiểm kê hình học và 20 mặt đứng — 13/09/2026

Mô hình có nguồn ảnh đúng địa điểm nhưng vẫn là khối bản đồ mở và vật liệu ảnh gần đúng. `PASS` của bộ kiểm tra xác nhận liên kết dữ liệu, không xác nhận độ chính xác hiện trạng. Danh mục từng target và fingerprint nguồn nằm trong [geometry-readiness.json](geometry-readiness.json).

## Kết quả kiểm kê

| Hạng mục | Kết quả đọc trực tiếp |
|---|---:|
| Target mặt đứng / công trình trong danh mục | 20 / 20 |
| Đủ điều kiện pipeline phủ ảnh | 15 |
| Dải ảnh phẳng | 14 |
| Vỏ tháp lấy mẫu ảnh và lặp (Vietcombank) | 1 |
| Chặn phủ do bề mặt chưa phù hợp | 5 |
| Target có hình học đã đo kiểm | 0 |
| Capture lưu cùng phiên bản 15b | 3: City Hall, Sun Wah, Vietcombank |
| Metadata nguồn footprint sai đã sửa | 2: Union Square, Continental |

Eligibility: review `accepted`, source_model `planar` và độ lệch pháp tuyến tính lại không quá 5°. Grand và Hương Sen có độ lệch pháp tuyến đích bằng 0 nhưng ảnh nguồn qua góc cong nên vẫn bị chặn. Đây là chốt bảo vệ cần giữ.

20 target nền gồm 9 estimated, 8 height-tag, 2 suy từ tầng, 1 podium. Giá trị height-tag là thuộc tính nguồn mở, chưa phải đo kiểm. Nguồn ảnh trải từ năm 2006 (Hyatt) đến 2025 (Sheraton), không đồng nghĩa hiện trạng đồng kỳ 2026. Giấy phép/nguồn được đối chiếu với snapshot đã lưu; không có xác minh pháp lý mới.

Toàn cảnh có 70.719 **khối**, bao gồm bộ phận công trình: 70.017 estimated, 448 levels, 191 height, 63 podium. Không gọi đây là 70.719 công trình thực đã xác minh độc lập.

## Giới hạn nền tảng

- `scripts/prepare_scene.py`: hệ hiển thị phẳng cục bộ `(lon-lon0)*111320*cos(lat0)` và `(lat0-lat)*110574`; không phải phép chuyển đổi sang CRS khảo sát hay hệ cao độ được kiểm định. Số tọa độ làm tròn 0,01 m không thể hiện độ chính xác centimet.
- `scene.meta.ground` và `app.js`: nền phẳng tham chiếu; công trình được cộng 1,5 m; nước ở mặt phẳng y=1. Chưa có địa hình/bờ kè/cao độ đường đo đạc.
- Quy tắc height: trường height; nếu thiếu thì số tầng × 3,2 m; nếu thiếu tiếp thì lớp diện tích footprint với dao động xác định. Các khối cha có parts thành podium tối đa 9 m nhằm tránh chồng khối, không phải số đo đế.
- `prepare_scene.py` thay ba parts Landmark 81 bằng bó khối minh họa với cao độ tự đặt được gắn nhãn. Bridge-detail cũng tự công bố structural geometry là stylised. Không được đổi nhãn thành công trình đo kiểm khi đưa vào chế độ trình lãnh đạo.
- Atlas mỗi mặt chỉ 500×500 px, mặt khuất/chiều sâu chưa tái dựng; bóng đổ và người/cây trong ảnh là dữ liệu ảnh chụp, không phải hình học. Việc thêm texture không giải quyết sai khối nền.
- Vietcombank: đỉnh tham chiếu 206 m không xác minh năm bậc thấp 154/164/174/185/197 m. Vỏ tháp dùng ảnh lấy mẫu và lặp, chưa khớp từng ô cửa. Đế giữ 9 m là proxy. Override City Hall 26 m có trong cấu hình nhưng bị chặn cùng mặt đứng, chiều cao nền hiệu lực vẫn 9,6 m.
- Nguồn hợp nhất OSM/Overture khác thời điểm; quy tắc bỏ khi giao diện tích >10% là lọc trùng hình học, chưa xác minh danh tính toàn bộ.

## Năm ưu tiên cho đợt kế tiếp

1. **Khóa danh tính khối và phiên bản hiện trạng.** Làm hồ sơ 20 công trình với đối chiếu địa chỉ, footprint, building:part, ảnh có ngày chụp. Riverside có footprint không tên; Caravelle là khối thấp 30 m; Renaissance target là đế. Hai metadata Overture đã được sửa trong đợt này.
2. **Thiết lập nền tọa độ/cao độ có kiểm chứng cho khu mẫu.** Thu bản đồ địa hình, ranh và mốc cao độ được phép sử dụng từ đơn vị quản lý; xác nhận phép chuyển CRS và điểm kiểm tra trước khi phủ quy hoạch. Giữ nền hiện có với nhãn gần đúng cho tới khi đủ dữ liệu.
3. **Hoàn chỉnh hình học trước khi tăng độ phân giải ảnh.** Ưu tiên Vietcombank, City Hall, Sun Wah, Grand, Hương Sen và Renaissance. Chia đúng mặt cong/góc/đế/tháp bằng hồ sơ hoặc bộ ảnh nhiều góc có kích thước tham chiếu; không tự điền bậc mái và mặt khuất.
4. **Làm bộ ảnh mặt đứng đồng kỳ và vật liệu theo từng mặt.** Hyatt 2006 cần ưu tiên thay mới; giữ tác giả, quyền dùng, ngày chụp, hash, vùng cắt. Tăng độ phân giải sau khi có ảnh phù hợp; chuẩn hóa LOD/texture để cận cảnh rõ nhưng vẫn chạy tốt. Cây, tàu, mặt nước có thể cải thiện vật liệu, song vị trí và chủng loại riêng của hiện trạng cần chứng cứ riêng.
5. **QA từng góc nhìn và lớp hiện trạng/quy hoạch.** Bổ sung capture cùng phiên bản cho 17 target còn thiếu, kiểm tra cả 20 sau mọi thay đổi. Kiểm tra cùng camera A/B, góc chéo, chân/mái, masks, trạng thái held, ảnh nguồn và nhãn chiều cao. Không dùng trạng thái `PASS` kỹ thuật để thay xác nhận của chuyên gia địa phương.

Các điểm trên là backlog được suy từ code/dữ liệu hiện có, không phải mô hình mới đã triển khai. Hồ sơ quy hoạch có nguồn chính thức cần đường dẫn và trạng thái riêng; ảnh Commons đúng nơi không phải hồ sơ phê duyệt quy hoạch.
