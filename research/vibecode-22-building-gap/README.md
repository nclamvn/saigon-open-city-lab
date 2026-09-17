# Batch 22 — Building Gap Recovery

Mục tiêu của batch này là tìm phần công trình mới còn thiếu trong cảnh TP.HCM, đồng thời phân biệt rõ **thiếu mặt bằng công trình** với **đã có mặt bằng nhưng chiều cao proxy quá thấp**. Kết quả chỉ là sàng lọc dữ liệu công khai phục vụ demo nội bộ; không phải bản đồ hoàn công, địa chính hay sản phẩm đo đạc.

## Nguồn đã kiểm tra

- OpenStreetMap live delta từ mốc snapshot cảnh `2026-05-31T22:37:44Z` đến `2026-09-17T11:52:46Z`.
- Overture Buildings release mới nhất khả dụng `2026-08-19.0`.
- Google Open Buildings Temporal v1, lát chiều cao epoch `2023-06-30`.
- HCMGIS public WFS, lớp `kinhte_vanhoa_xahoi_hcm:QHXD_NhaCaoTang_point`.

HCMGIS công bố 3.805 bản ghi nhà cao tầng; truy vấn bbox của demo trả 871 bản ghi. Metadata lớp chưa cho thấy điều khoản tái sử dụng, nên kết quả HCMGIS chỉ được dùng làm lớp đối chiếu nội bộ và cần văn bản cho phép trước khi phát hành thương mại hoặc chuyển giao.

## Kết quả đã nhập vào demo

| Hạng mục | Kết quả |
|---|---:|
| Biến động OSM hợp lệ đã rà | 353 |
| Đã được cảnh hiện hành phủ ≥70% | 219 |
| Hình học chồng 10–70%, giữ hàng đợi duyệt | 127 |
| Footprint thực sự thiếu, phủ ≤10%, đã thêm | 7 |
| Chiều cao HCMGIS qua đối chiếu kép, đã sửa | 87 |
| Tổng khối render sau cập nhật | 70.726 |
| Khối nguồn được đóng gói thành 3D Tiles/GLB | 70.716 |

Mười khối chênh giữa hai tổng là hình học minh họa landmark có chủ đích, không phải đối tượng nguồn GIS.

## Cửa kiểm soát

Một footprint mới chỉ được nhập khi là biến động OSM sau snapshot và phần diện tích đã được cảnh hiện hành phủ không quá 10%.

Một chiều cao chỉ được sửa khi đồng thời thỏa các điều kiện:

1. Điểm HCMGIS nằm trong footprint hiện hành.
2. Tỷ lệ diện tích HCMGIS/mô hình nằm trong khoảng 0,35–2,85.
3. Chiều cao HCMGIS nằm trong 12–300 m.
4. Google Temporal 2023 có chiều cao và sai khác không vượt `max(10 m, min(30 m, 32%))`.
5. Chiều cao nền đang là `estimated`, `podium` hoặc `levels`, và chiều cao mới lớn hơn tối thiểu 5 m.
6. Các bản ghi HCMGIS trùng cùng một footprint không được lệch nhau quá 10 m.

Các giá trị bất thường, dự án chỉ ở trạng thái đề xuất, điểm gần nhưng không nằm trong footprint và 127 biến động hình học chưa đủ chắc chắn đều bị loại khỏi bản dựng tự động.

## Tái lập

```bash
.venv-building-gap/bin/python outputs/hcmc-poc/scripts/build_building_gap_22.py
python3 outputs/hcmc-poc/scripts/prepare_scene.py
node outputs/shared/digital-twin-core/scripts/build-tiles-18.cjs
PYTHONPATH=work/pylib python3 research/vibecode-18/qa/check-produced-tiles.py
node outputs/shared/digital-twin-core/tests/tiles-18.cjs
.venv-building-gap/bin/python research/vibecode-22-building-gap/refinery.py research/vibecode-22-building-gap
.venv-building-gap/bin/python research/vibecode-22-building-gap/bites.py research/vibecode-22-building-gap
```

Manifest máy đọc được nằm tại `outputs/hcmc-poc/data/building-gap-22.json`. Hai báo cáo `refinery-report.txt` và `bites-report.txt` khóa bằng chứng nguồn, kiểm tra span trích dẫn, tính lặp lại và các lỗi provenance chủ động.

## Bước tiếp theo

- Chạy lại Overture sau release dự kiến kế tiếp và chỉ nhập delta vượt các cửa kiểm soát hiện tại.
- Xin quyền sử dụng bằng văn bản cho lớp HCMGIS, cùng ngày cập nhật và định nghĩa trường chiều cao.
- Duyệt thủ công 127 hình học chồng một phần bằng ảnh hợp pháp độ phân giải cao hoặc khảo sát mặt đất.
- Khi nhận dữ liệu thành phố hoặc drone, thay lần lượt footprint/height proxy bằng LoD2/LoD3 có CRS, mốc thời gian, độ chính xác và biên bản QC.
