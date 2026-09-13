# PoC 13 — Reality Enrichment Batch 01

## Kết quả

Batch 01 phá cảm giác “thành phố bằng khối hộp” bằng các lớp hình học cự ly gần, nhưng vẫn giữ nguyên footprint, tim đường và tuyến sông đã kiểm tra. Góc nhìn **19 · Reality Enrichment** là góc kiểm tra chính; nút **A/B** cho phép so sánh trực tiếp với mô hình nền.

- **Nhà cửa:** tối đa 900 công trình vùng lõi nhận lam đứng, gờ tầng/ban công và mái che tầng trệt. Vị trí được suy ra từ cạnh dài của footprint; kiểu dáng là thủ tục, không phải đo vẽ mặt đứng.
- **Đường sá:** vạch tim, biên đường và vạch qua đường được sinh trên các tuyến motorway–tertiary trong vùng LOD. Không tuyên bố phản ánh tổ chức giao thông hiện trạng tại từng nút.
- **Cây xanh:** tối đa 1.800 vị trí cây hiện có nhận thân bảy cạnh và ba cụm tán có biến thiên màu/kích thước.
- **Tàu bè:** 14 phương tiện trên hành lang sông đã audit được thay proxy hộp bằng thân tàu, cabin, kính, mái và wake; đường chạy không thay đổi.
- **Nước:** bổ sung vi gợn chuyển động với blending nhẹ, giữ nguyên vật liệu PBR và planar reflection.

## Kiến trúc hiệu năng

Toàn bộ chi tiết lặp dùng `InstancedMesh`. Batch thêm 13 draw call khi mọi lớp gần đều hiện. Mỗi nhóm có ngưỡng LOD độc lập: mặt đứng rút trước, rồi cây, vạch đường, cuối cùng tàu và nước. Ở góc toàn thành phố, lớp làm giàu tự ẩn.

## Ranh giới độ thật

PoC 13 tăng độ giàu cảm nhận, không biến dữ liệu mở thành bản sao khảo sát. Ban công, lam, mái che, kiểu tàu, vạch đường và tán cây được sinh thủ tục trên hình học có neo địa lý. Muốn tiến tới giống thực theo từng công trình, Batch 02 cần ảnh mặt đất/ảnh xiên có quyền sử dụng, phân đoạn mặt đứng, atlas quan sát và kiểm tra hiện trường.

## Batch tiếp theo

1. Thu ảnh hành lang Nguyễn Huệ–Bạch Đằng–Hàm Nghi theo kế hoạch 07C, khóa phơi sáng và cân bằng trắng.
2. Chọn 20 mặt đứng hero, chỉnh phối cảnh, che PII, bake atlas quan sát và ghi provenance từng ảnh.
3. Thay cây thủ tục bằng 6–8 archetype theo loài/hình thái quan sát.
4. Lấy mẫu vật liệu mặt đường, bó vỉa, biển báo và mặt nước theo điều kiện sáng mục tiêu.
5. Dựng LOD2/LOD3 riêng cho Bitexco, Landmark 81 và các công trình ven sông từ nguồn được cấp phép.
