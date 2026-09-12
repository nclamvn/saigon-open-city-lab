# PoC 04 — phản xạ mặt sông và góc cận Bitexco

Ngày 11/09/2026. Bản đang chạy tại http://127.0.0.1:8768/hcmc-poc/.

## Kết quả

PoC 04 thêm phản xạ phẳng của chính cảnh 3D lên sông Sài Gòn. Cảnh được render từ camera phản chiếu vào bộ đệm 768 × 768, cập nhật mỗi ba khung hình; gợn nước làm lệch nhẹ tọa độ lấy mẫu. Có công tắc **Phản xạ mặt sông** để so sánh và giảm tải khi cần.

Ảnh kiểm tra `poc-four-river-golden.png` được xuất trực tiếp từ canvas WebGL. Tại thời điểm lưu, trình duyệt báo khoảng 31 FPS, 30 draw calls ở lượt render chính và 2.290.266 tam giác. Đây là quan sát trên máy hiện tại, không phải benchmark đa thiết bị. Mỗi lần cập nhật phản xạ phải render lại cảnh nên chi phí GPU cao hơn số draw calls của lượt chính.

Góc **Bitexco · cận cảnh** đưa camera gần cụm tháp. Khung ngang theo nhịp tầng 3,3 m và khung đứng theo nhịp 3,1 m được dựng bám theo footprint. Sân đáp có vòng sơn, ký hiệu H, vành kim loại và đèn viền. Toàn bộ lớp này là chi tiết minh họa, chưa phải hình học khảo sát hay BIM.

Vật liệu kính dùng độ nhám thấp hơn tại vùng cửa sổ. Tham số ánh sáng ngày, giờ vàng, chạng vạng và chế độ kiểm tra nguồn được chia sẻ giữa cảnh chính và cảnh phản chiếu để hai lượt render nhất quán.

## Phạm vi đúng của kết quả

Phản xạ là kỹ thuật đồ họa thời gian thực trên mặt phẳng, chưa mô phỏng độ sâu, dòng chảy, độ đục hoặc quang học đã đo của sông. Màu phản xạ được pha với sắc nước tổng hợp để tránh biến mặt sông thành gương. Chi tiết Bitexco dựa trên footprint và mô tả công khai về sân đáp nhô ra; kích thước cục bộ vẫn là giả định.

Nguồn tham chiếu kiến trúc được dùng để hiểu cấu trúc, không dùng ảnh làm texture: trang dự án Bitexco Group và tài liệu mặt đứng Meinhardt. Các tệp ảnh tham chiếu chưa có quyền tái phân phối không được đóng gói vào sản phẩm.

## Kiểm tra

- JavaScript của `app.js`, `architecture.js`, `experience.js` và `river-reflection.js` vượt kiểm tra cú pháp.
- Đã quan sát cảnh sông, góc cận Bitexco, bộ đếm FPS và công tắc phản xạ trong trình duyệt.
- Ảnh xuất có attribution và số đo render kèm theo.
- Bản HTML tự chứa được tái tạo sau thay đổi.

## Bước tiếp theo

Tiếp tục tập trung vào Landmark 81 và không gian Nguyễn Huệ–Bạch Đằng: tạo hình học landmark tốt hơn từ ảnh nhiều góc có nguồn rõ, bổ sung vật liệu PBR/HDRI CC0 ở chế độ tổng hợp, và thử bóng tiếp xúc có giới hạn khoảng cách. Cận cảnh photorealistic thực sự vẫn cần bộ ảnh drone hoặc ảnh mặt đất đủ góc để chạy photogrammetry/Gaussian Splatting.
