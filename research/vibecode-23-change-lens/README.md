# PoC 23 - Construction Change Lens

## Kết quả đã triển khai

PoC 23 biến kết quả rà soát dữ liệu Batch 22 thành một lớp trình diễn có thể giải thích cho lãnh đạo và đồng thời giữ kỷ luật dữ liệu:

- 7 footprint OSM mới đã được đưa vào mô hình chính.
- 87 chiều cao đã được hiệu chỉnh sau đối chiếu HCMGIS/GITC và Google Open Buildings Temporal 2023 theo quy tắc Batch 22.
- 127 hình học được giữ ở lớp rà soát độc lập, không tự động nhập vào mô hình chính.
- 127 đối tượng được chấm điểm ưu tiên: 31 cao, 80 trung bình, 16 thấp.
- Chế độ `Trước snapshot / Sau đối chiếu` thay đổi đúng hình học của 7 footprint và 87 chiều cao, trong khi lớp đỏ chỉ đóng vai trò cảnh báo.
- Bộ lọc theo mức ưu tiên và thời điểm giúp hội đồng tập trung vào các tín hiệu đáng kiểm tra nhất.

Hàng đợi đầy đủ nằm tại `geometry-review-queue.csv`. Tệp máy đọc được phục vụ UI là `outputs/hcmc-poc/data/construction-change-23.json`.

## Nguyên tắc kiểm duyệt

| Nhóm | Trạng thái | Có trong mô hình chính | Ý nghĩa trình diễn |
|---|---|---:|---|
| Footprint mới | Đã rà quy tắc Batch 22 | Có | Biến động đã áp dụng từ OSM delta |
| Chiều cao | Đối chiếu kép | Có | Giá trị dựng đã sửa, chưa thay thế đo đạc hiện trường |
| Hình học chờ duyệt | Tín hiệu | Không | Vùng cần ảnh, hồ sơ hoặc người phụ trách xác nhận |

Không được dùng lớp rà soát để kết luận hiện trạng, cấp phép, nghiệm thu xây dựng hoặc điều hướng bay.

## Nguồn và mốc thời gian

- Snapshot nền OSM: `2026-05-31T22:37:44Z`.
- Truy vấn OSM delta: đến ngày 17/09/2026.
- Overture đã tích hợp: `2026-08-19.0`.
- Lịch phát hành Overture chính thức nêu bản tiếp theo dự kiến `2026-09-23.0`; đây là lịch đề xuất và có thể thay đổi.
- HCMGIS đã được tổ chức lại thành Trung tâm Công nghệ thông tin và Địa không gian Thành phố Hồ Chí Minh (GITC) theo thông tin công bố trên trang chính thức năm 2026.

Nguồn chính thức:

- [GITC / HCMGIS](https://hcmgis.vn/)
- [Lịch phát hành Overture](https://docs.overturemaps.org/release-calendar/)
- [Overture Buildings](https://docs.overturemaps.org/guides/buildings/)
- [Google Open Buildings Temporal](https://sites.research.google/gr/open-buildings/temporal/)
- [OpenStreetMap Copyright](https://www.openstreetmap.org/copyright)

## Tái lập

```bash
python3 outputs/hcmc-poc/scripts/build_change_lens_23.py
python3 outputs/hcmc-poc/scripts/check_overture_release_23.py
node outputs/hcmc-poc/scripts/qa-construction-change-23.cjs
```

Chỉ dùng `--check-network` để kiểm tra lịch Overture trực tiếp. Script chỉ báo cáo bản mới, không tải hay thay dữ liệu sản xuất.

## Bước người phụ trách cần thực hiện

1. Hoàn thiện thông tin pháp nhân, số công văn và người ký trong `CONG-VAN-DE-NGHI-GITC.md`.
2. Gửi GITC để xác nhận quyền sử dụng, định nghĩa trường, thời điểm cập nhật và đầu mối cấp dữ liệu.
3. Rà 31 đối tượng ưu tiên cao trước, ưu tiên hồ sơ chính thức, ảnh có thời gian chụp rõ hoặc khảo sát hiện trường.
4. Chỉ chuyển một đối tượng từ hàng chờ sang mô hình chính sau khi có bằng chứng và ghi quyết định vào registry.
