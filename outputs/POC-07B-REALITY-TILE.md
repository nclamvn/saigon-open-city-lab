# PoC 07B — Reality Tile đầu tiên

## Kết quả

PoC 07B đưa một nội dung GLB thật vào tile **rp-r2c3**, vùng Bitexco–Nguyễn Huệ. Tile chứa **193 công trình**, **16.735 tam giác**, dung lượng **2.411.224 byte** và được nạp bất đồng bộ trong trình duyệt.

Khi camera tới gần tile, shader của mô hình nền loại đúng phần proxy trong ranh ô và GLB LOD2 thay vào cùng hệ tọa độ. Nút **A/B** chuyển tức thời giữa proxy và LOD2. Góc nhìn **10 / Reality Tile 07B** mở thẳng vùng kiểm thử.

## Phân loại dữ liệu

Nội dung này là **procedural/open-data LOD2**, được dựng từ footprint và registry chiều cao đang có. Các dải mặt đứng được sinh theo quy tắc để kiểm thử hình học chi tiết, tải GLB, vật liệu và chuyển LOD. Đây **không phải** photogrammetry, Gaussian Splatting hay reality mesh khảo sát.

Các giá trị vẫn được khai báo:

- Reality mesh khảo sát: **0%**.
- Texture khảo sát: **0%**.
- Điểm khống chế: **0**.
- Sai số vị trí: **chưa kiểm định**.
- Datum đứng: **quy ước cục bộ, chưa khảo sát**.

## Tệp và hợp đồng ingest

- `hcmc-poc/tiles/rp-r2c3/lod2.glb`: glTF 2.0 binary.
- `hcmc-poc/tiles/rp-r2c3/provenance.json`: nguồn, hash và phân loại.
- `hcmc-poc/tiles/rp-r2c3/quality.json`: giới hạn hình học và texture.
- `hcmc-poc/tiles/rp-r2c3/license.txt`: chỉ dẫn attribution.
- `hcmc-poc/data/3dtiles/tileset-07b.json`: content URI theo cây 3D Tiles 1.1.
- `hcmc-poc/scripts/build_reality_tile_07b.py`: builder tái lập GLB.
- `hcmc-poc/scripts/validate_reality_tile_07b.py`: kiểm tra fail-loud.

Bản HTML tự chứa nhúng trực tiếp GLB dưới dạng base64; bản nhiều tệp tải qua URI của tile. Hai bản dùng cùng parser GLB giới hạn cho cấu trúc do builder phát sinh.

## Kiểm định

Validator xác nhận header GLB 2.0, độ dài file, metadata 193 công trình, SHA-256, content URI, trạng thái `unverified` và cờ `surveyedRealityMesh: false`. SHA-256 của GLB hiện tại:

`163935185c7d257907afb7acb96aab5e817908f7d4ef91cdef9cdfd404ae1a10`

Kiểm tra trình duyệt xác nhận GLB nạp thành công, A/B đổi được hai lớp và không có lỗi runtime. Ảnh kiểm chứng `poc-seven-b-realitytile.png` ghi nhận tile hoạt động ở khoảng cách camera 278 m, **109 FPS**, 71 draw call và 2.342.805 tam giác trên máy kiểm thử tại thời điểm chụp.

## Bước kế tiếp

07C sẽ giữ nguyên hợp đồng ingest nhưng thay GLB procedural bằng một bộ ảnh mặt đất có quyền sử dụng. Cần bổ sung quy chiếu, scale bar hoặc điểm khống chế, kiểm tra sai số và xử lý phần mái còn khuất. Khi có dữ liệu UAV, cùng tile ID và sidecar được dùng để thay nội dung mà không đổi giao diện.
