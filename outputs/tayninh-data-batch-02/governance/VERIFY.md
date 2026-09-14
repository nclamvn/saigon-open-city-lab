# CONTRACTOR VERIFY — Batch 02 Gia Lộc

Ngày nghiệm thu: 2026-09-14  
Trạng thái: **READY WITH DEFERRED ITEMS**

## Kết luận

Batch 02 đạt biên nghiệm thu đã định trong `BLUEPRINT.md`: đã có dữ liệu công trình không rỗng, lớp phủ bề mặt, ảnh quang học có ngày chụp, raw bytes, snapshot nguồn, SHA-256, dữ liệu dẫn xuất theo AOI và Workbench chạy local không cần API key. Các lớp này là baseline công khai trước chuyến bay Hera; chúng chưa phải dữ liệu đo đạc hoặc hồ sơ pháp lý.

## Mức hoàn thành Blueprint

| Yêu cầu | Kết quả | Bằng chứng chính |
|---|---|---|
| R01 BUILDINGS | PASS | Microsoft Global ML Building Footprints: 657 polygon trong AOI mẫu; 0 hình học rỗng/lỗi; chiều cao và confidence đều để `null` khi nguồn trả `-1`. |
| R02 SURFACE | PASS | WorldCover 2021 v200 10 m; Sentinel-2B L2A ngày 2025-11-30, TCI 10 m và SCL 20 m. |
| R03 NORMALIZE | PASS | GeoJSON/GeoTIFF/PNG theo AOI; CRS, bounds, nodata, phân bố lớp, hashes và lineage đã ghi. |
| R04 REGISTRY | PASS | 22 records; 10 acquired, 9 candidate, 3 blocked; 0 validation errors. Năm bite âm tính đều chặn đúng. |
| R05 VISUAL | PASS | Workbench local hiển thị ảnh Sentinel, footprint, đường, nước; WorldCover/SCL/DEM bật riêng. QA JSON không còn xuất hiện như một layer giả. |
| R06 VERIFY | PASS | Hash, spatial QA, strict build, adversarial gates, Browser scenarios và console đều đạt. |

Blueprint: **6/6 yêu cầu đạt (100%) trong biên Batch 02**.

## Dữ liệu đã thu mới trong Batch 02

### Công trình

- Raw Microsoft Vietnam quadkey `132230111`: 194,537,400 bytes; SHA-256 `77638b74e1cbabf7d9895251ab8539e51413be40a5c0fe42b86fe352c0e1f1a2`.
- Đã đọc 2,305,243 source features và trích 657 polygon giao AOI mẫu.
- GeoJSON dẫn xuất: 380,701 bytes; SHA-256 `74be4a0ae5962dc8672d67e09361dc41222105b1bae97bf472fa9225dc2b6ff7`.
- 657/657 `height_m=null`, 657/657 `confidence=null`; không suy diễn chiều cao.
- Nguồn Microsoft thưa ở khoảng phía tây khoảng 2,186 m của bbox mẫu. Đây là khoảng trống của nguồn, không phải bằng chứng ngoài thực địa không có nhà.

### Bề mặt và ảnh quan sát

- WorldCover raw: 92,338,709 bytes; SHA-256 `7e9c655b7eefe460f92f0a15122295d33b33c3e1493afd56a463fb973dcc1cbc`.
- WorldCover AOI: 361×361, 130,321 pixel hợp lệ, 0 nodata; 7 lớp xuất hiện. Tỷ lệ lớn nhất: cây 52.128974%, cỏ 22.203636%, cây trồng 14.205692%, built-up 10.668273%.
- Sentinel-2B TCI raw: 306,086,947 bytes; SHA-256 `a55484db6427772adcb994d6b25b1b0fe5dce76356dc971376a97a115196c617`.
- Sentinel-2B SCL raw: 3,750,890 bytes; SHA-256 `dbef89cd29fa907b6093e5fb718bcdb9270767db0070001b5c568f41f839a16f`.
- Scene `S2B_T48PXT_20251130T033239_L2A`, thời gian `2025-11-30T03:34:50.914Z`, cloud metadata toàn scene 0.017494%. AOI SCL có 27,722 pixel hợp lệ, 0 pixel cloud và 0 pixel shadow theo mã SCL của sản phẩm.

## Độ phủ yêu cầu sau khi sửa semantic mapping

- 8/23 nhóm review có dữ liệu đã thu chạm tới: `R02,R04,R05,R06,R12,R13,R14,R20`.
- 3/237 câu hỏi có đầu vào công khai chạm tới: `2D-B-01,3D-C-01,3D-F-01`.
- “Chạm tới” chỉ có nghĩa dữ liệu đóng góp một phần đầu vào; không đồng nghĩa câu hỏi nghiệp vụ đã được trả lời đầy đủ.
- Đã loại mapping sai: ảnh 10 m không được tính là `R03` true ortho khoảng 1 cm; một scene Sentinel không được tính là `R10` hoặc `2D-L-01` so sánh biến động hai kỳ; đường/nước OSM không được tính là số công trình hoặc bề rộng đường thực tế.

## Kiểm tra kỹ thuật

```text
Batch 01 strict build: 18 records, 0 validation errors
Batch 02 strict build: 22 records, 0 validation errors
Registry bites: PASS source hash, evidence, duplicate id, AOI mismatch,
                derived input mismatch, manifest not array
JavaScript syntax: PASS registry builder + workbench
gzip integrity: PASS Microsoft raw
git diff --check: PASS
```

Browser scenarios: **6/6 PASS**.

1. Workbench tải đúng 22 records và 10 nguồn acquired.
2. Mặc định có 1 raster ảnh Sentinel cùng 611 SVG paths; vector nằm trên raster.
3. Bật WorldCover tăng raster đang render từ 1 lên 2; tắt trả về 1.
4. Tìm `Microsoft` trả đúng 1 record; xóa tìm kiếm trả đủ 22 records.
5. Liên kết file Batch 01 trỏ về thư mục Batch 01; các PNG Batch 02 trả HTTP 200.
6. Console có 0 warning và 0 error.

Mức lỗi nghiệm thu: **P0=0, P1=0, P2=0**.

## Deferred items

- Ranh phường Gia Lộc chính thức và kiểm kê toàn phường.
- Địa chính, quy hoạch và tài sản có thẩm quyền.
- GCP/CP, true ortho khoảng 1 cm và kiểm chứng sai số XY/Z.
- Point cloud LiDAR dày, DTM/DSM survey-grade và vertical datum xác nhận.
- Ảnh mặt đứng, chiều cao công trình đo thực, cây cá thể và hạ tầng kỹ thuật chi tiết.
- Tối thiểu hai epoch đã đăng ký đồng nhất để phát hiện biến động.

Các mục này là đầu vào cho chia sẻ dữ liệu cấp tỉnh hoặc chuyến bay Hera; không được suy diễn từ dữ liệu công khai hiện có.
