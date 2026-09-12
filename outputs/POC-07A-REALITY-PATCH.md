# PoC 07A — Reality Patch Scaffold

## Kết quả

PoC 07A tạo vùng thử nghiệm **Nguyễn Huệ – Bạch Đằng – Bitexco** rộng khoảng **1,687 km²**, chia thành lưới **4 × 4 = 16 tile**. Trong vùng có **2.006 khối proxy** lấy từ mô hình nền. Reality mesh và texture khảo sát được khai báo đúng là **0%** vì dự án chưa có dữ liệu UAV hoặc bộ ảnh mặt đất đủ điều kiện.

Góc **09 / Reality Patch Lab** hiển thị ranh tile, mức sẵn sàng chiều cao, đường mái proxy và HUD LOD. Khi camera tiến gần dưới 450 m, HUD chuyển sang LOD 2 và cảnh báo nội dung reality còn thiếu. Đây là hành vi fail-loud có chủ ý.

## Hợp đồng thay nóng

Mỗi tile có ID ổn định từ `rp-r1c1` tới `rp-r4c4` và hai URI dự kiến:

- `tiles/<tile-id>/lod1.glb`
- `tiles/<tile-id>/lod2.glb`

Sidecar bắt buộc khai báo nguồn, giấy phép, ngày chụp, CRS ngang, datum đứng, độ chính xác vị trí và GSD texture. Schema nằm tại `hcmc-poc/data/3dtiles/ingest-contract.schema.json`.

`tileset-plan.json` dùng cấu trúc không gian của 3D Tiles 1.1 nhưng chưa trỏ tới content giả. Khi có GLB thật, pipeline chỉ cần kiểm định sidecar rồi thêm content URI tương ứng.

## Registry nguồn miễn phí

| Nguồn | Trạng thái 07A | Vai trò | Giới hạn |
|---|---|---|---|
| OpenStreetMap | Đã lưu snapshot | Đường, nước, footprint | Không phải chiều cao khảo sát |
| Overture Maps | Đã lưu snapshot | Footprint bổ sung và lineage | Cần giữ attribution theo nguồn |
| Google Open Buildings Temporal | Đã lưu ứng viên chiều cao | Prior/đối chiếu khu vực | Không phải DSM đô thị khảo sát |
| Copernicus DEM GLO-30 | Ứng viên, chưa tải | Nền bề mặt khu vực | 30 m quá thô cho tránh vật cản tầm thấp |
| Mapillary | Chưa audit coverage | Tham chiếu mặt đứng | Cần API, provenance từng ảnh và kiểm tra điều khoản tái sử dụng |
| Dữ liệu do đơn vị vận hành tự chụp | Chưa có | Mesh/texture/GCP kiểm định | Là đầu vào cần thiết để đạt reality patch thật |

Registry máy đọc được: `hcmc-poc/research/reality-patch-sources.json`.

## Tệp tạo ra

- `hcmc-poc/data/reality-patch-manifest.json`: AOI, LOD, trạng thái và hợp đồng content.
- `hcmc-poc/data/reality-patch-grid.geojson`: 16 ô để mở trong GIS.
- `hcmc-poc/data/3dtiles/tileset-plan.json`: cây không gian 3D Tiles, chưa có content giả.
- `hcmc-poc/data/3dtiles/ingest-contract.schema.json`: cổng kiểm định tile mới.
- `hcmc-poc/research/reality-patch-readiness.csv`: thống kê từng tile.
- `hcmc-poc/scripts/build_reality_patch.py`: tái lập toàn bộ registry không gian từ scene hiện tại.

## Điều kiện để sang 07B

Chỉ cần một tile có bộ ảnh hợp lệ. Tile đó được xử lý thành GLB hoặc splat, quy chiếu về origin của tile, kèm sidecar quality/provenance. 07B sẽ thay proxy đúng tile đó và đo sai lệch, dung lượng, thời gian tải và FPS A/B.

## Kiểm định 07A

Builder chạy lặp lại cho cùng SHA-256 manifest `84a0073682d9e685409bdd3e3a896baa6f3c80a965652f8a76910b79643a5f88`. Validator xác nhận 16 ID tile duy nhất, tổng số khối khớp 2.006, manifest nhúng khớp JSON gốc, mọi tile đều khai báo reality mesh còn thiếu và cây 3D Tiles chưa chứa content giả. Ảnh `poc-seven-a-patchlab.png` cùng metrics ghi nhận LOD 2 yêu cầu nội dung reality nhưng coverage vẫn là 0%.
