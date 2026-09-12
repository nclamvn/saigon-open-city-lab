# PoC 03 — Chiều cao toàn vùng và chi tiết mặt đứng

Ngày 11/09/2026. Bản đang chạy: http://127.0.0.1:8768/hcmc-poc/

## Kết quả

Đã đọc raster Google Open Buildings Temporal v1, mốc 30/06/2023, cho toàn bbox 106.684–106.739° E, 10.750–10.808° N (38,57 km²). Raster ba kênh được lấy trung bình về 1600 × 1600 pixel, lưu GeoTIFF cùng dấu vết nguồn và SHA256. Giữ nguyên dữ liệu PoC 02 để tái lập.

Có **20.178 khối** đang dùng chiều cao ước lượng đạt bộ lọc để thử chiều cao Google, tăng từ 723 khối. Tương đương **28,53%** tổng 70.719 khối. Đây là độ phủ của bộ lọc trong mô hình, không phải tỷ lệ công trình được đo chính xác.

| Nhóm đối chiếu | Số khối | Trung vị Google − nguồn cũ | Trung vị chênh lệch tuyệt đối | Phân vị 90 chênh lệch tuyệt đối |
|---|---:|---:|---:|---:|
| Chiều cao ước lượng | 20.178 | −5,2 m | 5,6 m | 11,3 m |
| Có thẻ height | 81 | −4,1 m | 9,5 m | 25,8 m |
| Có số tầng | 294 | +2,15 m | 5,85 m | 23,37 m |

Các con số trên chỉ là **chênh lệch giữa nguồn**, chưa phải sai số so với đo đạc. Mẫu đối chiếu đã qua lọc pixel và loại chiều cao nguồn ≥95 m, nên có thiên lệch chọn mẫu. Kết quả chưa đủ để kết luận Google tốt hơn hoặc thay thế mặc định dữ liệu hiện có.

## Cách dùng

Bật **Chiều cao Google · thử nghiệm** để xem mô hình thay đổi; tắt để trở về bản gốc. Chọn một công trình trong vùng được thay để đọc cả chiều cao nền lẫn giá trị Google đang hiển thị. Bật **Nguồn chiều cao** tự động trả hình học về bản gốc trước khi tô màu nguồn.

Bật/tắt **Chi tiết mặt đứng · minh họa** để so sánh khung ngang và đứng trên các tháp kính gần trung tâm. Các chi tiết bám theo footprint có sẵn, nhưng kích thước khung và nhịp tầng là giả định thiết kế, chưa phải mặt đứng khảo sát. Gộp toàn bộ khung thành một InstancedMesh để hạn chế số lệnh vẽ.

## Bộ lọc và tái lập

Chỉ thay khối có nguồn chiều cao `estimated`; không thay landmark minh họa, thẻ chiều cao hoặc số tầng. Lấy trung vị trong footprint, ít nhất bốn pixel có presence ≥0,5 và chiều cao 2–95 m; ít nhất 50% pixel footprint hợp lệ. Chiều cao mới phải lớn hơn cao độ chân khối. Khối có chiều cao cũ ≥95 m không tham gia. Presence là điểm mô hình chưa hiệu chuẩn, không phải xác suất đúng.

- Tải: `hcmc-poc/scripts/download_height_region.py`.
- Lọc: `hcmc-poc/scripts/sample_height_region.py`.
- Kiểm tra/thống kê: `hcmc-poc/scripts/report_height_region.py`.
- Dữ liệu: `hcmc-poc/data/height-region.json`.
- Bảng đối chiếu: `hcmc-poc/data/height-region-comparison.csv`.
- Dấu vết: `hcmc-poc/data/google-height-region-provenance.json`.

Nguồn [Google Open Buildings Temporal](https://sites.research.google/gr/open-buildings/temporal/), chọn giấy phép CC BY 4.0. Dữ liệu năm 2023, giới hạn chiều cao 100 m, độ phân giải hiệu dụng công bố khoảng 4 m. Không phải hiện trạng đo đạc 2026.

## Tiến độ lộ trình

1. Camera, ánh sáng và UAV minh họa: đã có ở PoC 02.
2. Chiều cao toàn vùng và đối chiếu: đã thực hiện ở PoC 03; giữ ở chế độ thử nghiệm vì chưa có dữ liệu đo độc lập.
3. Kiến trúc trung tâm: đã thêm lớp khung mặt đứng; chưa hoàn thành mô hình chi tiết từng landmark từ ảnh tham chiếu.
4. HDRI/PBR, bóng tiếp xúc, phản xạ cảnh trên nước: chưa triển khai.
5. Cận cảnh photogrammetry/Gaussian Splatting: chưa có bộ ảnh phù hợp.
6. Tile/LOD, đo sai số và cập nhật vận hành: chưa triển khai.

## Kiểm tra

Kiểm cú pháp JavaScript; 20.178 chỉ số khối duy nhất, chiều cao hợp lệ, đủ pixel; kiểm tra trực quan bản chạy trong trình duyệt, công tắc Google và chuyển về nguồn gốc. Chưa kiểm định độ chính xác bằng điểm đo độc lập. Chất lượng hình ảnh vẫn là mô hình hình học với vật liệu tổng hợp.
