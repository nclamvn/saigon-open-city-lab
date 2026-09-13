# VERIFY 16c — Lỗi xuyên ảnh Times Square

Contractor kiểm tra ngày 13/09/2026 theo TIP của Builder; user yêu cầu sửa lỗi render tại Saigon Times Square. Phạm vi gồm lỗi giao nhau giữa ảnh mặt đứng và các chi tiết mô phỏng nền. Không thay nội dung ảnh hay hình học công trình.

## Kết quả

REQUIREMENT COVERAGE: 4/4,100%: tái hiện lỗi; sửa vùng giao nhau; A/B khôi phục; kiểm tra góc nghiêng.

Nguyên nhân đọc từ code: mặt ảnh cách footprint0,16m trùng mặt ngoài mullion depth0,32m, tạo z-fighting; gờ và fin mô phỏng nhô ra xuyên ảnh. Bản mới chỉ loại fragment trang trí đúng công trình và đúng vùng ảnh/mask đang hiển thị. Depth test vẫn bật, offset giữ0,16m. Shadow depth dùng cùng vùng cắt; khi ảnh tắt hoặc không hiện thì bỏ cắt.

SCENARIO RESULTS: 5/5 kiểm tra browser PASS trên Chrome1671×907:

1. Tái hiện bản16b đang mở: vệt trắng dọc và hai thanh ngang như screenshot user.
2. Nạp16c cùng Times Square: vệt và thanh biến mất; ảnh/mái/đế còn nguyên trong screenshot.
3. Tắt A/B: ảnh tắt, nền cùng gờ và khung cửa phục hồi; status.active=false.
4. Bật A/B rồi kéo xoay: ảnh sạch ở góc nghiêng, mặt bên giữ chi tiết nền; không thấy ảnh bị đẩy xa khỏi mặt nhà.
5. Console error0 ở phiên mới, shader biên dịch và render được; status.depthTestPreserved=true,maskPreserved=true,patches14,cuts16. 5 mục held và vỏ lấy mẫu Vietcombank không được chuyển thành photo patch.

TECHNICAL HEALTH: regression9/9 PASS với actualThree/manifest; facade15 validator PASS; performance16b controller8/8 và demo19/19 PASS theo Completion Builder. Gói HTML dựng lại thành công; git diff --check PASS. Không có TypeScript/lint pipeline cấu hình; không báo giả0 lỗi của công cụ không chạy.

OVERALL STATUS: READY cho bản sửa lỗi được báo. Giới hạn giữ nguyên: ảnh chỉ phủ phần có nguồn, mặt bên/mái/đế còn là mô hình gần đúng; chưa tái dựng đầy đủ công trình hoặc kiểm tra góc nhìn thực tế của toàn bộ14patches. Kiểm thử hình học/mask ngoài Times Square dựa trên regression, không thay thế xem từng công trình.
