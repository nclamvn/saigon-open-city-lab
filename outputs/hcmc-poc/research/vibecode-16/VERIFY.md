# VERIFY — Batch 16

Contractor kiểm tra ngày 13/09/2026. Phạm vi: giao diện lãnh đạo + danh mục nguồn + kiểm kê 20 công trình. Không phải nghiệm thu độ chính xác của toàn bản đồ hoặc phê duyệt nội dung quy hoạch.

## REQUIREMENT COVERAGE

Triển khai **8/8 REQ, 100%** của BLUEPRINT cho batch này. REQ-01/02/03/06: shell và tương tác. REQ-04/05: 4 nguồn, không có hình học/giai đoạn tự tạo. REQ-07: kiểm kê 20 target và sửa metadata nguồn sai cho 2 mục. REQ-08: giữ engine, regression và đóng gói; kiểm tra mở file offline bằng trình duyệt chưa thực hiện được, ghi dưới đây. Không diễn giải 100% phạm vi batch thành 100% digital twin.

## SCENARIO RESULTS

16 nhóm kiểm tra trình duyệt localhost PASS:

1. URL không có view vào overview, daylight 0,18; không mặc định đêm.
2. Tải lại URL facade Vietcombank giữ đúng công trình.
3. Quy hoạch hiển thị 4 nguồn và thông báo chưa có bản vẽ đối chiếu, không timeline hay mô hình tương lai.
4. Chuyển Quy hoạch ↔ So sánh ↔ Tham quan chỉ có một drawer, aria-expanded cập nhật.
5. A/B Vietcombank đổi đúng trạng thái lớp ảnh, camera giữ nguyên: position [-820.4554,327.774,724.1121], target [-652.8436,108.6114,380.7375] trước/tắt/bật.
6. Chọn City Hall đang held: cả hai nút A/B disabled.
7. Tour 4 điểm overview/river/boulevard/landmark, tiến/lùi/dừng đúng; cuối tour không thể tiến thêm.
8. Screenshot 390×844: không đè chữ hoặc tràn ngang; drawer có vùng cuộn, ảnh thật và giấy phép; đóng bảng trả diện tích bản đồ.
9. Screenshot 1440×900: bảng nguồn bên trái, phần bản đồ còn lại rộng; scrollWidth=1440.
10. Escape đóng bảng và trả focus điều khiển mở.
11. Nghiên cứu mở bộ điều khiển cũ; quay lại lãnh đạo ẩn HUD kỹ thuật và bảng cũ.
12. Ẩn giao diện và nút hiện lại hoạt động, không mất lối trở lại.
13. Sau refinement, fullscreen có aria-pressed/nhãn Thoát toàn màn hình và trạng thái app active; click lần hai trở về. Có thông báo khi nền tảng không hỗ trợ. Chỉ kiểm tra phiên trình duyệt hiện tại, không bảo đảm mọi nền tảng.
14. ArrowUp trên canvas thay đổi position/target sau khi camera đã ổn định.
15. Nút Về toàn cảnh đưa về overview, thu bảng và trả focus canvas.
16. Console error log rỗng ở phiên kiểm tra cuối; nguồn và ảnh tham chiếu hiển thị.

**1 kiểm tra chưa hoàn tất:** mở gói file HTML cục bộ bằng browser automation bị chính sách URL của công cụ chặn. Không dùng cách vòng để vượt chặn. Kiểm tra cấu trúc gói đã PASS nhưng không thay thế kiểm thử offline thực tế. Người vận hành cần mở gói trên máy demo trước khi dùng làm dự phòng.

## TECHNICAL HEALTH

- UI static validator: 16/16 PASS; gồm JavaScript syntax.
- Existing demo validator: 19/19 PASS.
- Existing cinematic UI validator: 19/19 PASS.
- Facades 15 validator: PASS; 20 nguồn/hash/license/anchor, 15 eligible, 5 held, không override podium; 3 capture 15b tồn tại và regression A/B hình học/UV giữ nguyên.
- Planning validator: PASS; JSON/JS identity, 2 hash HTML đã lưu; 6/6 fixture dữ liệu sai bị chặn, 0 geometry layer và 0 planning stage.
- Build: static app không bundler. Gói SAIGON-3D.html dựng thành công, 50.320.540 byte theo báo cáo Builder cuối; kiểm tra đóng gói 4/4 PASS.
- Type/lint: không có TypeScript hoặc lint pipeline cấu hình; không ghi “0 lỗi” cho kiểm tra không tồn tại.
- Hiệu năng: có quan sát bộ đếm khoảng 12 FPS trong lúc QA desktop; không làm benchmark hoặc cam kết tốc độ trình chiếu. Cần đo trên máy/màn hình đích.

## OVERALL STATUS

**READY-với-deferred cho bản xem trước batch 16**, chưa phải bản trình chính thức được chuyên môn thành phố duyệt.

Deferred rõ ràng: (1) offline runtime trên máy đích; (2) benchmark và chạy dài buổi demo; (3) QA hình ảnh hiện hành cho 17 target còn thiếu capture 15b; (4) khảo sát/xác nhận hệ tọa độ, cao độ, khối công trình; (5) bộ hồ sơ quy hoạch có phiên bản, quyền dùng và đối chiếu chuyên môn. Các mục 3–5 là khoảng trống sẵn có, không được che bằng giao diện hoặc nâng nhãn độ chính xác.

## REFINE đã thực hiện

- Thêm nguồn gốc bài đăng lại, ngày/cơ quan/giới hạn trong details từng tài liệu.
- Sửa focus canvas sau điều hướng để phím mũi tên không mắc ở nút đã ẩn.
- Thay proxy nút fullscreen bằng gọi trực tiếp, theo dõi kết quả và phản hồi lỗi/no-op.
- Gỡ dấu R của loading, giữ City Lab; không hiện loader đã đóng trong accessibility.
- Sửa metadata OSM → Overture cho Union Square/Continental ở ba bản dữ liệu đồng bộ; không thay ảnh hoặc hình học.
