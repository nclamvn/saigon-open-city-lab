# TIP — Batch 20B · Hero Cluster Nhà hát–Lam Sơn

## Mục tiêu

Mở rộng quy trình hero 20A thành một cụm đô thị có thể trình diễn liên tục cho lãnh đạo: Nhà hát Thành phố, Hotel Continental, Caravelle Saigon, công trường Lam Sơn và trục Đồng Khởi. Ưu tiên nhận diện thị giác, camera không xuyên công trình và bằng chứng đi cùng từng đối tượng.

## Phạm vi thực hiện

- Giữ nguyên hero Nhà hát 20A làm mốc trung tâm.
- Continental: ảnh Commons gốc 5.472×3.648 px, texture hiệu chỉnh 2.048×2.048 px và hình học nổi trong bao cao 24 m.
- Caravelle: ảnh Commons gốc 3.385×5.000 px cho cánh thấp; tháp riêng dùng thông tin 24 tầng từ lịch sử chính thức.
- Lam Sơn–Đồng Khởi: sáu đoạn đường OSM lưu trữ, mặt đường, cây, đèn và tám xe minh họa bám polyline.
- Năm preset camera, một hành trình cụm 38 giây và trailer lãnh đạo bảy cảnh/62 giây.
- HUD kính nhỏ, ảnh nguồn, tác giả, ngày, giấy phép và giới hạn theo từng cảnh.

## Bằng chứng và phân loại

| Thành phần | Nguồn | Phân loại |
|---|---|---|
| Vị trí Continental | building `2000032897` và trục mặt đứng trong manifest | Open-data mapped envelope |
| Mặt đứng Continental | Wikimedia Commons, Hans Brian Brandsberg Berg, CC BY 2.0 | Sourced site photo, perspective-rectified |
| Cánh thấp Caravelle | building `39598465`, bao cao 30 m và ảnh Commons | Mapped envelope + sourced site photo |
| Số tầng tháp Caravelle | Lịch sử chính thức Caravelle: 24 tầng | Official storey count |
| Chiều cao tháp 76,8 m | 24 × 3,2 m | Display rule, not surveyed |
| Lam Sơn và Đồng Khởi | road IDs `35112941`, `35114970`, `287132223`, `1278461438`, `1278461439`, `1343964589` | Archived OSM centerlines |
| Bề rộng đường, lát nền, đèn, cây, xe | Quy tắc trình diễn | Illustrative proxy |

Ảnh chỉ được crop, hiệu chỉnh phối cảnh, bù tương phản nhẹ và giảm kích thước. Không inpainting hoặc sinh pixel. Batch 20B không bật hình học quy hoạch tương lai.

## Tiêu chí nghiệm thu

1. Năm điểm nhìn mở trực tiếp bằng URL và chuyển được từ HUD.
2. Continental và Caravelle đọc được ảnh đúng địa điểm trên vỏ công trình tương ứng.
3. Camera Continental và Đồng Khởi không nằm trong khối công trình.
4. Xe chạy dọc polyline OSM; metadata không gọi đây là giao thông quan sát.
5. Nguồn ảnh, ID hình học, số tầng chính thức và giả định chiều cao có trong receipt/runtime.
6. Trailer có bảy cảnh và tổng thời lượng 62 giây.
7. Không có lỗi runtime mới; tương tác đạt tối thiểu 45 FPS trên máy demo.

## Ngoài phạm vi

- LoD3 khảo sát, mặt khuất và mái dựng từ multi-view.
- Chiều cao, vị trí tháp Caravelle và public realm đã đo kiểm.
- Hiện trạng giao thông thời gian thực.
- Hình học quy hoạch tương lai chưa được cơ quan có thẩm quyền cung cấp hoặc xác nhận.
