# 16d — Times Square: phủ khối nhất quán, đọc biển tên

User yêu cầu phủ kín khối và đọc được chữ Times Square. Rút gọn workflow Vibecode: Contractor đối chiếu ảnh, duyệt phương án và nghiệm thu; Source Builder lấy ảnh gốc/receipt; Geometry Builder sửa ảnh dẫn xuất và renderer. Không hỏi duyệt lại công việc đã yêu cầu.

## Căn cứ và ranh giới

Ảnh2020 gốc2388×3490 đã tải; ảnh1280 và tile500 cũ gây thiếu độ nét. Ảnh thực cho thấy mái chia cao độ, biển tên trên mái thấp và tòa nhà phía trước che thân dưới. Không có căn cứ dùng một vùng ảnh thân trên kéo giãn thành toàn bộ mặt nhà hoặc coi mặt khuất là đã chụp.

## Yêu cầu

- R1: loại sự lệch vật liệu xanh nhạt ở viền/đế/mặt bên bằng vỏ kính thống nhất lấy mẫu từ nguồn, khai báo phần suy dựng.
- R2: dành texture độ phân giải cao cho mặt quan sát được, chọn góc cắt theo nhịp cửa cùng cao độ, không cắt biển tên hoặc đổi chữ bằng phông tự tạo.
- R3: ảnh thật và vật liệu suy dựng vẫn phân biệt trong thông tin nguồn; giữ giấy phép/ngày/tác giả, lưu receipt và hash.
- R4: giữ clipping16c để không xuyên khung/gờ; A/B trả đúng hình học/vật liệu nền; các công trình khác không đổi.
- R5: kiểm tra ảnh cận, góc nghiêng/mặt bên và tắt/bật; không kết luận đã phục dựng chính xác toàn kiến trúc.

## Nghiệm thu

Contractor xem ảnh dẫn xuất trước tích hợp và screenshot ứng dụng sau tích hợp. Kiểm tra chữ thực có đọc được ở cự ly phù hợp, không còn mảng xanh nền không liên quan trên khối Times. Nếu hình học cơ sở không đủ diễn tả bậc mái thì giữ nhãn gần đúng, không tự nâng độ chính xác. Source snapshot cũ được giữ để có thể so sánh/khôi phục.

## Contractor visual review — refinement

First runtime preview: R2 lettering improved and original pixels intact; R1 failed. A solid sampled blue color plus procedural fine grid still looked like a large pale rectangle around a darker photographic patch. Contractor rejected that preview, approved source-derived sign-free glass texture extension aligned to the observed columns and the same material response as the photo. Other footprint walls can receive sampled glass texture, explicitly inferred. Do not repeat the sign or alter footprint/heights. This is within the user's existing request to finish the whole block; no additional permission gate.
