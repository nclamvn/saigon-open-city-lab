# UI QA 25F — City Lab map shell

## Mục tiêu

Giữ bản đồ là nội dung chính, khôi phục điều hướng tham quan và chuẩn hoá toàn bộ chrome theo một hệ kích thước duy nhất. Bản này loại bỏ bảng giới thiệu trùng nội dung, giữ các công cụ chuyên môn ở trạng thái thu gọn và đưa thao tác tham quan vào dock cố định.

## Hệ kích thước

| Thành phần | Chuẩn |
|---|---:|
| Nút icon | 32 × 32 px |
| Icon SVG | 16 × 16 px, tâm sai lệch 0 px |
| Select / nút hành động | 40 px |
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
- Chế độ Hide luôn giữ lại nút mắt mở ở góc trái; trạng thái thường chỉ hiện mắt nhắm và phím `H` là lối mở phụ.
- Trạng thái panel được tách theo phiên bản 25F để bản demo khởi động với điều khiển cảnh thu gọn, dock tham quan mở.
- Flood Lab mobile dừng trước dock và HUD; diện tích giao nhau đo được bằng 0.
- Nhãn địa danh được xếp ưu tiên, tự ẩn khi va nhau hoặc va vào panel chrome.
- Cảnh báo IOC nổi được bỏ ở mobile vì KPI cảnh báo đã có trong Flood Lab.

## Kết quả QA

- Desktop 1280 × 720: topbar, dock tham quan và Flood Lab không giao nhau.
- Mobile 390 × 844: `nav × flood = 0 px²`, `nav × HUD = 0 px²`.
- Icon đang hiển thị: 32 × 32 px; SVG 16 × 16 px; lệch tâm ngang/dọc `0 px`.
- Select kịch bản và ba nút mô phỏng: cao 40 px.
- Điều hướng Ba Son cập nhật URL, trạng thái active và tự đóng Flood Lab.
- Các bộ kiểm tra `project-hygiene`, `webgpu-materials-24`, `flood-25a` đều đạt.

## Tiêu chí hồi quy

1. Không dùng ký tự văn bản `×`, `⌄`, `⌃` làm icon chrome.
2. Không thêm panel cố định mới nếu chưa chứng minh không che dock, HUD hoặc panel nghiệp vụ.
3. Điều hướng tham quan phải hoạt động khi panel chuyên môn đang mở.
4. Mọi điều khiển chính dùng chiều cao 40 px; mọi nút chỉ có icon dùng 32 px.
5. Mỗi breakpoint phải đo giao nhau bằng hình học DOM, không chỉ nhìn ảnh chụp.
