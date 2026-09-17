# TIP 19 — Executive visual story

## Mục tiêu

Tạo một tuyến trình diễn trực quan có thể bắt đầu bằng một thao tác, dùng chính mô hình TP.HCM hiện hành để dẫn người xem từ toàn cảnh đến bờ sông, chi tiết đô thị, ảnh mặt đứng có nguồn và cảnh đêm minh họa.

## Quyết định

- Yêu cầu “triển khai bước phù hợp tiếp theo” là phê duyệt triển khai hướng visual-first đã đề xuất; không cần checkpoint Blueprint riêng.
- Ban ngày là điểm vào mặc định. Cảnh đêm chỉ dùng ở đoạn kết và phải ghi rõ là ánh sáng minh họa.
- Không dựng hình học quy hoạch tương lai khi chưa có bản vẽ đã kiểm chứng.
- Tận dụng scene và ảnh đã có nguồn; batch này không nhập dữ liệu khảo sát mới.

## Acceptance criteria

- REQ-19-01: Có nút “Trình diễn thành phố” rõ ràng trong giao diện lãnh đạo.
- REQ-19-02: Trình diễn gồm 5 cảnh, có tiến/lùi, tạm dừng, thoát và thanh tiến độ.
- REQ-19-03: Mở bằng ban ngày; cảnh đêm không phải mặc định.
- REQ-19-04: Cảnh ảnh thật hiển thị ảnh nguồn, tác giả/giấy phép và giới hạn hình học.
- REQ-19-05: Nội dung không tuyên bố dữ liệu minh họa là khảo sát hoặc quy hoạch chính thức.
- REQ-19-06: Hỗ trợ bàn phím, reduced motion và màn hình nhỏ.
- REQ-19-07: Có trạng thái máy đọc được và kiểm thử tự động cho luồng chính.

## Phạm vi file

- `outputs/hcmc-poc/executive-story-19.js`
- `outputs/hcmc-poc/executive-story-19.css`
- `outputs/hcmc-poc/index.html`
- `research/vibecode-19/qa/verify-executive-story.mjs`

