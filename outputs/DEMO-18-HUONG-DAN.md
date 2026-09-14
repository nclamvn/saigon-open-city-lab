# City Lab TP.HCM — demo đợt 18

[Toàn cảnh ban ngày](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=overview) · [Ảnh và địa hình](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=surface18).

## Trình diễn

1. Bắt đầu ở toàn cảnh ban ngày để giới thiệu khu vực trung tâm. Giữ năm tác vụ: Khám phá, Quy hoạch, So sánh, Tham quan, Phân tích.
2. Trong **Khám phá → Ảnh & địa hình**, chọn **Mở ảnh & địa hình**, sau đó **Xem toàn vùng dữ liệu**. Đây là ảnh Sentinel ngày 26/04/2026 trên địa hình mô hình, không phải khảo sát UAV.
3. Cuộn để tiến gần; kéo trái để xoay, kéo phải để dịch chuyển. Đóng panel rồi dùng mũi tên/WASD để di chuyển, Q/E để xoay, +/- để zoom. Mảnh công trình thay theo camera, tối đa 32 mảnh/32 MiB; vùng xa có thể chưa dựng đủ khối.
4. Chạm khối nhà để xem ID nguồn, chiều cao dựng và trạng thái ước lượng. Metadata chi tiết nằm trong phần mở rộng; dùng nút ảnh/địa hình dưới màn hình để mở lại panel.
5. Trong **20 công trình · xem ảnh thật**, chọn ảnh và chạm ảnh để phóng lớn, xem ngày/credit/giấy phép. Kích thước ghi cho tệp tham chiếu đã lưu; một số tệp là thumbnail nhà cung cấp, không phải ảnh nguyên bản từ camera. **Đến công trình 3D** trở về workflow mặt đứng cũ; các mặt chưa đủ dữ liệu vẫn giữ trạng thái chờ.
6. **Về bản đồ nền** khôi phục camera, ánh sáng và credit trước đó. Mở **Phân tích** cũng khôi phục nền phẳng trước khi chạy phép tính đợt 17. Sau đó có thể dùng Tham quan để giới thiệu ánh sáng đêm.

`H` ẩn UI, `F` toàn màn hình, `0` đặt lại góc, `Esc` đóng lớp nổi. Khi select/input đang có focus, phím dùng cho control; đóng panel và chạm bản đồ trước khi di chuyển. Giữ credit khi lưu hoặc xuất ảnh.

## Khởi động và bàn giao

Từ thư mục dự án:

```sh
python3 outputs/hcmc-poc/serve.py
```

Máy chủ chỉ bind `127.0.0.1:8768`, hỗ trợ Range và ETag. Nếu cổng đã có server đợt 18 hoạt động, dùng server đó. `python -m http.server` không đáp ứng contract Range này. Không mở bằng `file://`; không dùng `SAIGON-3D.html` lịch sử để demo công cụ mới.

Bàn giao cả `outputs/hcmc-poc/` và `outputs/shared/digital-twin-core/` với cấu trúc tương đối nguyên vẹn. Engine, GeoTIFF.js, GLTFLoader và COG/GLB đang dùng nằm trong thư mục; liên kết nguồn bên ngoài vẫn cần mạng. Giữ giấy phép vendor và attribution dữ liệu/ảnh.

## Cách giới thiệu trung thực

“Chúng tôi đã xây lớp tiếp nhận nguồn có kiểm chứng, streaming ảnh/địa hình và công trình theo góc nhìn. Dữ liệu quan sát hiện có lưới khoảng 10 m; địa hình mô hình khoảng 31 m. Ảnh thực giúp kiểm mặt đứng, nhưng đây chưa phải bản sao đo đạc chi tiết từng nhà.”

Không gọi LOD hiển thị là CityGML LoD2/3; không gọi GEDTM là LiDAR; không trình bày ảnh đơn lẻ là SfM/3DGS. Không trình nguồn PDF, bảng dữ liệu hay endpoint chưa tiếp nhận là lớp quy hoạch đã phê duyệt. [Kiến trúc và nguồn](../research/vibecode-18/ARCHITECTURE-AND-SOURCES.md), [Verify](../research/vibecode-18/VERIFY.md).
