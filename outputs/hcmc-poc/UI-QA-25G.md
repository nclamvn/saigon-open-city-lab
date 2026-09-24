# UI QA 25G — City Lab map shell

## Mục tiêu

Giữ bản đồ là nội dung chính, khôi phục điều hướng tham quan và chuẩn hoá toàn bộ chrome theo một hệ kích thước duy nhất. Bản này loại bỏ bảng giới thiệu trùng nội dung, giữ các công cụ chuyên môn ở trạng thái thu gọn và đưa thao tác tham quan vào dock cố định.

## Hệ kích thước

| Thành phần | Chuẩn |
|---|---:|
| Nút icon | 32 × 32 px |
| Icon SVG | 16 × 16 px, tâm sai lệch 0 px |
| Chữ trong nút thao tác | tối thiểu 12 px |
| Select / nút hành động | 40–44 px |
| Thanh City Lab | 44 px desktop, 40 px mobile |
| Bo góc panel | 15 px |
| Khoảng mép desktop | 16 px |
| Khoảng mép mobile | 8 px |

## Thay đổi đã kiểm tra

- Dock **Tham quan** luôn hiện: Toàn cảnh, Ven sông, Nguyễn Huệ, Ba Son và Ngập đô thị.
- Chọn một góc tham quan sẽ đóng Flood Lab để trả lại diện tích cho bản đồ.
- Mobile dùng dock ngang sát đáy; các nút không chồng nhau và có thể cuộn ngang khi cần.
- Bảng vật liệu, Flood Lab và thông tin công trình cùng dùng một cơ chế collapse/expand.
- Dấu X và chevron được thay bằng SVG cùng stroke, cùng kích thước và căn tâm hình học.
- Các ký tự icon còn sót `◐`, `▶`, `⌖`, `Ⅱ` được thay bằng SVG; mỗi trạng thái chỉ hiện đúng một icon.
- Sửa đơn vị CSS sai `1.25gr` thành `1.25fr`, khôi phục lưới hai nút mưa cân đối.
- Chế độ Hide luôn giữ lại nút mắt mở ở góc trái; trạng thái thường chỉ hiện mắt nhắm và phím `H` là lối mở phụ.
- Trạng thái panel được tách theo phiên bản 25G để bản demo khởi động với điều khiển cảnh thu gọn, dock tham quan mở.
- Flood Lab mobile dừng trước dock và HUD; diện tích giao nhau đo được bằng 0.
- Nhãn địa danh được xếp ưu tiên, tự ẩn khi va nhau hoặc va vào panel chrome.
- Cảnh báo IOC nổi được bỏ ở mobile vì KPI cảnh báo đã có trong Flood Lab.
- Mọi button có `type="button"`, ID không trùng và mọi `aria-controls` đều trỏ tới phần tử tồn tại.

## Kết quả QA

- Desktop 1280 × 720: topbar, dock tham quan và Flood Lab không giao nhau.
- Mobile 390 × 844: `nav × flood = 0 px²`, `nav × HUD = 0 px²`.
- Icon đang hiển thị: 32 × 32 px; SVG 16 × 16 px; lệch tâm ngang/dọc `0 px`.
- Mọi nút có chữ đang hiển thị: chữ tối thiểu 12 px, cao tối thiểu 40 px; select và nút mô phỏng cao 44 px.
- Điều hướng Ba Son cập nhật URL, trạng thái active và tự đóng Flood Lab.
- Các bộ kiểm tra `project-hygiene`, `webgpu-materials-24`, `flood-25a` đều đạt.

## Tiêu chí hồi quy

1. Không dùng ký tự văn bản `×`, `⌄`, `⌃`, `◐`, `▶`, `⌖`, `Ⅱ` làm icon chrome.
2. Không thêm panel cố định mới nếu chưa chứng minh không che dock, HUD hoặc panel nghiệp vụ.
3. Điều hướng tham quan phải hoạt động khi panel chuyên môn đang mở.
4. Mọi điều khiển có chữ cao ít nhất 40 px và dùng chữ ít nhất 12 px; mọi nút chỉ có icon dùng 32 px.
5. Mỗi breakpoint phải đo giao nhau bằng hình học DOM, không chỉ nhìn ảnh chụp.
