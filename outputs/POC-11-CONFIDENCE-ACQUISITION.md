# PoC 11 — Confidence Map & Acquisition Priority

## Kết quả

PoC 11 biến các khoảng trống dữ liệu thành một bản đồ ra quyết định. Mô hình gán điểm tin cậy cho 70.719 công trình, tổng hợp theo lưới 8 × 8 trên toàn vùng 38,57 km² và xếp hàng 12 ô nên khảo sát trước.

- Trung vị điểm tin cậy công trình: **33/100**.
- Trung bình: **33,04/100**.
- Ô ưu tiên cao nhất: **cf-r5c3 — 68,8/100**.
- Ảnh mới đã thu: **0**.
- Reality tile đã khảo sát: **0**; độ phủ reality khảo sát: **0%**.

Góc nhìn `17 · Confidence Map` dùng đỏ/cam cho công trình thiếu dữ liệu và xanh ngọc cho công trình có tín hiệu nguồn tốt hơn. Lưới màu thể hiện mức ưu tiên theo ô; 12 cột cam đánh dấu hàng đợi thu thập.

## Mô hình điểm

Điểm tin cậy cấp công trình bắt đầu từ nguồn chiều cao:

| Nguồn chiều cao | Điểm cơ sở |
|---|---:|
| Đế gần đúng | 26 |
| Chiều cao ước lượng | 31 |
| Suy từ số tầng | 60 |
| Có `height` trực tiếp | 72 |

Điểm có thể cộng 11 nếu có thẻ màu/vật liệu trực tiếp, 2 nếu có tên và 2 nếu bản ghi Overture giữ provenance; điểm tối đa là 88. Đây là thang ưu tiên nội bộ, không phải xác suất đúng hoặc sai số đo đạc.

Điểm ưu tiên ô gồm 62% khoảng trống dữ liệu và 38% tầm quan trọng thị giác. Thành phần tầm quan trọng gồm khoảng cách tới vùng hero Nguyễn Huệ–Bạch Đằng, mật độ công trình và độ phức tạp theo chiều đứng.

## Năm ô đầu hàng đợi

| Hạng | Ô | Điểm | Phương thức đề xuất |
|---:|---|---:|---|
| 1 | cf-r5c3 | 68,8 | Ảnh xiên UAV + khống chế mặt đất |
| 2 | cf-r4c3 | 68,4 | Ảnh xiên UAV + khống chế mặt đất |
| 3 | cf-r6c3 | 67,5 | Ảnh xiên UAV + khống chế mặt đất |
| 4 | cf-r6c2 | 65,5 | Hành lang ảnh mặt đất |
| 5 | cf-r4c4 | 64,5 | Ảnh xiên UAV + khống chế mặt đất |

Danh sách đầy đủ nằm trong `hcmc-poc/research/acquisition-priority-11.csv`.

## Phạm vi sử dụng

Phân loại của lớp này là `derived_priority_model_not_survey_validation`. Điểm dùng để sắp thứ tự khảo sát và kiểm thử pipeline. Nó chưa xét phép bay, vùng hạn chế, an toàn, thời tiết, khả năng tiếp cận, sự đồng ý của chủ sở hữu hay điều kiện vận hành tại hiện trường.

Một ô chỉ được tăng độ tin cậy sau khi dữ liệu có quyền sử dụng, thời gian chụp, thông số camera, bằng chứng khống chế và kiểm định chất lượng được nhập qua cổng provenance.

## Kiểm định

- Hash sinh lại tất định: PASS.
- Lưới 8 × 8 và 64 ID duy nhất: PASS.
- 70.719 điểm công trình trong giới hạn 0–88: PASS.
- Hàng đợi 12 ô khớp phép xếp hạng: PASS.
- Trạng thái 0 ảnh và 0 tile khảo sát được giữ rõ: PASS.
- Ba phương thức thu thập và hợp đồng nâng cấp hợp lệ: PASS.
- Ảnh WebGL và metrics view 17: PASS.

Ảnh kiểm thử: `poc-eleven-confidence.png`; metrics: `poc-eleven-confidence.metrics.json`; manifest: `hcmc-poc/data/confidence-map-11.json`.
