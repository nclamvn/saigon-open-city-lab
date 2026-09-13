# Batch 16b — Kính và độ mượt

User yêu cầu ngày 13/09/2026: polish UI cao cấp, nền kính thay nền đặc, đồng nhất kích thước và giảm lag/giật. Tiếp tục Vibecode: Contractor thiết kế/kiểm tra; UI Builder và Performance Builder triển khai hai nhánh độc lập. Frontend Design áp dụng phần UI.

## Yêu cầu và nghiệm thu

- R1: nav và drawer cùng chiều rộng, cùng mép trái; 4 nút đều; kiểm tra desktop và 390px.
- R2: thấy cảnh qua kính, chữ vẫn rõ; không dùng blur toàn màn hình, giảm blur khi tương tác.
- R3: bốn tác vụ, source disclosures, A/B/held safeguards, bàn phím và fullscreen tiếp tục hoạt động.
- R4: đo frame time, CPU và render passes trước/sau cùng view, kích thước; phân biệt chi phí JS với GPU/compositor. Không cam kết FPS khi chưa đo.
- R5: tối ưu render thừa, bóng/phản xạ và cập nhật UI; khi giảm độ phân giải trong lúc thao tác phải khôi phục sau khi dừng. Không xóa dữ liệu hoặc tự sửa hình học.
- R6: chuyển camera nhất quán theo thời gian, không phụ thuộc số FPS; kiểm tra xoay/zoom/chọn công trình, tránh giật do đổi chất lượng liên tục.

## Phân công

UI Builder sở hữu leadership-16.js/css. Performance Builder sở hữu app/render modules, telemetry, integration/index/package. Contractor đo bằng DOM telemetry và thao tác browser, không viết mã triển khai. Hai Builder dùng chung tín hiệu body.city-interacting để giảm chi phí kính khi cảnh đang di chuyển.

## Decisions

Không yêu cầu duyệt lại: sửa UI và hiệu năng là công việc người dùng đã chỉ rõ, giữ nguyên engine và phạm vi dữ liệu. Nguồn và nhãn gần đúng vẫn giữ. Phép đo là QA trong phiên máy hiện tại, không phải benchmark bảo đảm cho mọi máy; báo lại giới hạn nếu cảnh vẫn nặng. Bản HTML local chỉ kiểm tra đóng gói trong đợt này, không thử vòng qua giới hạn URL file của công cụ browser.
