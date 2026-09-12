# PoC 07C.1 — Hiệu chỉnh cầu Ba Son

> **Đính chính phạm vi:** báo cáo này chỉ áp dụng cho cầu Ba Son đang khai thác ở phía bắc. Công trình người dùng chỉ ra tại Bến Bạch Đằng là cầu đi bộ Bạch Đằng–Thủ Thiêm đang thi công, được xử lý riêng trong `POC-07C2-BACH-DANG-FOOTBRIDGE.md`.

## Kết luận đối chiếu

Cây cầu trong vùng hiển thị là **cầu Ba Son**, tên cũ là cầu Thủ Thiêm 2. Đây là cầu dây văng bất đối xứng, có một tháp chính tạo hình đầu rồng lệch về phía Thủ Thiêm và hai mặt phẳng dây văng. Cổng Thông tin điện tử TP.HCM công bố nhịp dây văng chính dài 200 m, sáu làn xe và thiết kế của WSP Finland. Trang dự án Đại Quang Minh công bố tháp cao 113 m, phần cầu dài 885,7 m và tổng chiều dài công trình 1.465 m.

- Nguồn chính thức: [Cổng Thông tin điện tử TP.HCM](https://tphcm.chinhphu.vn/khanh-thanh-cau-thu-thiem-2-bieu-tuong-moi-cua-tphcm-10122042811124683.htm)
- Nguồn chủ đầu tư: [Đại Quang Minh](https://www.dqmcorp.vn/cau-thu-thiem-2)

## Phần đã sửa

- Giữ hai tim đường cầu đã ánh xạ từ dữ liệu cảnh: `321564421` và `321564423`.
- Bổ sung dầm dưới mặt cầu để loại bỏ cảm giác dải đường treo trên sông.
- Bổ sung bốn cụm đỡ S1–S4, gồm móng, thân trụ và xà mũ; S2 đồng thời là móng tháp chính.
- Dựng một cặp sườn tháp nghiêng, uốn theo hình thức đầu rồng và đặt lệch về bờ Thủ Thiêm.
- Dựng hai mặt phẳng cáp với 28 dây minh họa, gồm dây nhịp chính và dây neo phía sau.
- Thêm góc nhìn số 12, HUD cấu trúc và công tắc riêng cho cầu Ba Son.

## Kiểm chứng

- Validator đối chiếu hai tim cầu, bốn cụm trụ, thông số công bố, nguồn và cờ giới hạn: **PASS**.
- Ảnh WebGL cuối ghi nhận 91 FPS, 116 draw calls và 2.342.873 tam giác trên máy chạy thử; đây là quan sát tại thời điểm chụp, không phải benchmark.
- Console trình duyệt không có lỗi runtime trong lượt kiểm tra cuối.

## Giới hạn

Hình học kết cấu là mô hình cách điệu neo theo tim cầu và mép nước trong snapshot dữ liệu của PoC. Vị trí trụ, tiết diện cấu kiện, độ võng dây và tĩnh không chưa được suy ra từ bản vẽ thi công hoặc đo khảo sát. Mô hình phù hợp để truyền đạt hình thái đô thị và kiểm tra trải nghiệm 3D, chưa phù hợp cho thiết kế, dẫn đường UAV hoặc phân tích kết cấu.
