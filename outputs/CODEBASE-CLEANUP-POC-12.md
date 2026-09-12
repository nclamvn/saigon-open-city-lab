# Demo hardening và dọn nợ kỹ thuật — PoC 12

## Đã hoàn thiện

- Tách hành vi trình chiếu khỏi engine thành `demo-shell.js`; không chạm lại pipeline hình học và shader đã kiểm chứng.
- Chuẩn hóa trạng thái `aria-expanded`, `aria-controls`, `aria-current` cho dock, drawer và HUD.
- Thêm chế độ ẩn UI, toàn màn hình, reset góc, Escape đóng lớp nổi và thông báo trạng thái ngắn.
- Chặn điều hướng bản đồ bằng bàn phím khi dialog hoặc drawer đang mở, tránh thao tác xuyên lớp.
- Sửa Cinematic HUD để thật sự có nút thu gọn như các HUD còn lại.
- Thêm touch target 44 px, visible focus, responsive presenter control và `prefers-reduced-motion`.
- URL tự giữ góc nhìn đang chọn để có thể chuẩn bị sẵn một cảnh demo.
- Thêm validator riêng cho bản demo, kịch bản demo 3 phút và bản HTML độc lập.

## Giới hạn kiến trúc còn lại

Các lớp PoC 02–12 vẫn là các module JavaScript tuần tự dùng chung trạng thái Three.js toàn cục. Cấu trúc này phù hợp bản trình diễn tĩnh hiện tại, nhưng khi chuyển thành sản phẩm nên đưa view state, layer lifecycle và asset loading vào một store/module graph có API rõ ràng. Việc đó là một đợt tái kiến trúc, không nên trộn vào vòng hardening ngay trước demo.
