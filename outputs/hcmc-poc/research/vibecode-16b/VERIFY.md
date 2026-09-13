# VERIFY 16b — UI kính và tương tác

Contractor kiểm tra ngày 13/09/2026. REQUIREMENT COVERAGE: **6/6 yêu cầu triển khai (100%)** theo BLUEPRINT. Đây là tối ưu phần mềm trong cấu hình thử, không phải cam kết FPS cho mọi máy.

## Kết quả thị giác và tương tác

- R1 PASS: desktop 1440px — nav/drawer đều left24,width360; màn hình390px — đều left14,width360, scrollWidth390. Bốn cột tab đều nhau. Screenshot Chrome1671×907 và màn hình390×844 đã xem trực tiếp.
- R2 PASS: kính rgba(18,44,54,0.72), blur10px khi đứng yên,2px khi thao tác. Cảnh nhìn xuyên qua; header không còn khối đặc. Chỉ nội dung bảng cuộn, không tràn ngang.
- R3 PASS: chọn Sun Wah held có cảnh báo và chặn A/B; Vietcombank A/B bật/tắt được, giải thích vật liệu lấy mẫu vẫn hiện. Disclosure nguồn mở được và có tác giả/ngày/giấy phép. Điều hướng Landmark, pan phím mũi tên, zoom bằng + và kéo xoay canvas thực hiện được. Cảnh đêm tải và render sau khởi tạo shader.
- R4 PASS về đo lường: telemetry thật trong DOM, CPU và frame time tách biệt; số đo dưới đây. Không ghi thời gian CPU như thời gian GPU.
- R5 PASS: qualityTransitions thực trên Chrome: DPR2 →1,25 / reflection1024→512 khi chuyển cảnh; sau dừng khôi phục DPR2/reflection1024. Đã thấy chu kỳ này lần nữa sau zoom/pan. Không sửa hình học/atlas/ảnh.
- R6 PASS: mô phỏng controller xác nhận easing15/60FPS cùng thời gian cho kết quả tương ứng; camera kết thúc chuyển cảnh, interaction=false và qualityRestored=true. Browser xác nhận đích/distance thay đổi sau zoom/pan, không mắc vĩnh viễn ở chất lượng thấp.

## Đo tại Chrome

Cùng tab, công trình Sun Wah, viewport1671×907, DPR2, bảng đóng, camera preset gần như nhau (sai khác khoảng2,5cm distance do ngưỡng dừng easing). Rolling180frame sau khi tải và camera ổn định. So sánh tuần tự có tác vụ/màn hình khác cùng chạy, không phải benchmark phần cứng cô lập.

| Chỉ số | Cấu hình gốc perf=baseline | Tối ưu |
|---|---:|---:|
| CPU toàn frame (ms) | 7,77 | 3,94 |
| CPU gửi lệnh render (ms) | 6,71 | 3,08 |
| Draw calls trung bình, cộng các lượt render | 78,5 | 55,8 |
| Tam giác cộng các lượt render | 3.822.859 | 2.691.580 |
| Frame p50 (ms) | 16,6 | 16,5 |
| Frame p95 (ms) | 25,0 | 23,7 |
| Frame p99 (ms) | 33,3 | 25,0 |
| FPS rolling | 68,1 | 65,9 |

CPU frame giảm khoảng49%, draw calls khoảng29%. **Không chứng minh FPS đứng yên tăng**; biến thiên GPU/compositor và tác vụ đồng thời vẫn có. Giảm tam giác ở bảng là bớt lượt vẽ lại phản xạ, không bỏ công trình.

In-app browser overview1440×900 DPR1 cho CPU1,88→1,19ms nhưng FPS104,3→70 khi điều kiện foreground thay đổi; không dùng cặp này để quảng bá tăng FPS. Số khung >50ms là tích lũy với thời gian phiên khác nhau nên không so trực tiếp.

## TECHNICAL HEALTH

- Controller behavior: **8/8 PASS** (baseline, telemetry, quality/restore, shadow invalidation, cadence, easing).
- UI integration: **16/16 PASS**; demo regression **19/19 PASS**.
- Facades validator PASS:20 nguồn,15 eligible,5 held, không podium override, ảnh và atlas giữ nguyên.
- JavaScript syntax PASS trong validators; git diff --check PASS.
- Build HTML nhúng thành công: **50.332.677 byte**. Không có TypeScript/lint toolchain để báo đếm lỗi kiểu/lint.
- Có lỗi mixed-cache lúc đang thay module và đo thử lần đầu; phép đo đó bị loại. Đã thêm optional hooks và chỉ bật optimization khi controller khởi tạo xong, rồi reload đồng bộ trước phép đo hợp lệ.
- Đã xem render ngày/đêm; đường lưu PNG được rà thứ tự render→copy→encode trước await để tương thích preserveDrawingBuffer=false. Chưa kiểm nghiệm PNG ngày/đêm xuất thực tế trong đợt này.

## OVERALL

**READY-với-deferred cho bản xem trước16b.** Hai yêu cầu polish và tối ưu đã triển khai, đo và xem trực tiếp. Deferred: benchmark dài trên máy demo/cảnh nặng nhất, kiểm thử PNG xuất thực tế và runtime HTML offline (công cụ chặn URL file từ đợt trước). Bộ nguồn quy hoạch và độ chính xác hình học không thay đổi trong batch này.
