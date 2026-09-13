# PoC 14 — Surface Realism & Open Visual Research

Đợt 13/09/2026. Ưu tiên hình ảnh là nền tảng cho các phase digital twin tiếp theo.

## Đã triển khai

- **27 mục được điều tra:** 18 thư viện mã nguồn và 9 kho tài nguyên/ảnh. Đây là tập chọn lọc theo các lớp của hệ thống, không phải tuyên bố đã cào toàn bộ Internet.
- **63 claim có đoạn chứng cứ** trong snapshot chính thức, registry xây lại tất định, hash cho snapshot và texture. Nguồn không đủ kết luận giữ null.
- **5 bộ PBR / 15 texture:** Asphalt033, PaintedPlaster017, Ground037, Bark014, PavingStones036 từ ambientCG. Metadata nguồn phân loại cả năm là PBRPhotogrammetry. Đây là scan vật liệu thư viện, không phải scan bề mặt tại TP.HCM.
- **Tích hợp trực tiếp:** asphalt, nền xanh, vỏ thân cây, lát đi bộ; vữa sơn thêm biến thiên màu/độ nhám và normal lên phần tường đặc. Kính giữ cơ chế riêng.
- **1.200 vị trí cây / 24.000 tấm cụm lá:** alpha cutout tạo khe hở và bóng có hình lá. Bố trí theo các vị trí cây nền đã có; loài cây và chi tiết lá vẫn là procedural.
- **Góc 20 · Bề mặt & cây xanh**, nút A/B, HUD thu gọn và trang thư viện giải pháp có tìm kiếm/lọc. 15 texture nhúng nội bộ; không gọi API lúc xem demo.

12 ảnh tham chiếu TP.HCM đã được tìm qua Wikimedia API: metadata có tác giả, trang nguồn và CC-BY-SA 3.0/4.0; gồm UBND TP.HCM, Nguyễn Huệ, Vietcombank Tower, cầu Mống và góc nhìn từ Bitexco. Chưa tải ảnh hay bake vào công trình. Metadata lưu tại `hcmc-poc/research/visual-14/hcmc-image-candidates.json`.

## Đánh giá giải pháp và quyết định

| Lớp | Nguồn/thư viện | Quyết định thực thi | Giới hạn cần xử lý |
|---|---|---|---|
| Vật liệu vật lý | ambientCG | Tải 5 bộ CC0, lưu nguồn và hash, tích hợp 15 map | Tiling scale một số asset là giả định; không đại diện vật liệu đúng công trình |
| Vật liệu/HDRI/model scan | Poly Haven | Giữ HDRI hiện có; dùng API chính thức cho batch sau | Điều khoản API khác asset; cần nhận diện ứng dụng và ghi nguồn live API |
| Decal đô thị | cgbookcase | Shortlist nắp cống, vết vá, bề mặt đường | Chưa tải hay benchmark từng decal |
| Cây phân nhánh | EZ-Tree | Ứng viên ưu tiên để sinh GLB nhiều LOD trước khi nhập | Kiểm tra asset lá riêng và phiên bản Three.js; chưa tích hợp thư viện |
| Props tàu/xe/ghế/biển | Kenney, Quaternius | Dùng cho LOD xa sau tuyển chọn | Nhiều pack thiên về stylized; không phải giải pháp photoreal hero |
| Model chi tiết | BlenderKit | Chỉ nhập asset có quyền đóng gói phù hợp | Kho trộn CC0/Royalty Free; không coi toàn kho là CC0 |
| Ảnh đúng địa điểm | Wikimedia Commons, Mapillary, KartaView | Tạo hàng đợi ảnh tham chiếu và ảnh mặt đứng | Coverage HCMC, chất lượng và quyền từng ảnh chưa được chốt |
| Bóng tiếp xúc | N8AO | Ưu tiên benchmark trong nhánh module renderer | Chưa xác minh tương thích với Three.js UMD hiện tại; không gắn mù vào renderer |
| Khử răng cưa/hậu kỳ | pmndrs/postprocessing | Thử SMAA và AO trước khi tăng bloom | Cần giữ màu/ngày–đêm và đo chi phí GPU |
| Mesh/texture delivery | glTF Transform, meshoptimizer, Basis Universal | Chuẩn đích GLB + LOD + KTX2 cho batch tài nguyên lớn | Chưa chuyển toàn pipeline hiện tại; cần benchmark decode và VRAM |
| Stream đô thị | 3DTilesRendererJS; CesiumJS; MapLibre | Three.js + 3DTilesRendererJS gần kiến trúc hiện tại nhất | Engine không tự cung cấp hình ảnh/mesh HCMC; Cesium/MapLibre là lựa chọn kiến trúc khác |
| Tái dựng ảnh | COLMAP, OpenMVG, OpenMVS, Meshroom, ODM | Dựng pipeline offline khi có bộ ảnh đa góc | Dữ liệu chụp, calibration, compute và license dependency là điều kiện đầu vào |
| Hero reality patch | gsplat + Spark hoặc GaussianSplats3D | Benchmark một patch có ảnh đúng địa điểm | Splat không tự có semantic/collision mesh; ánh sáng thường đã bake vào ảnh |

License trong registry thư viện lấy từ metadata repo sơ cấp. `NOASSERTION` nghĩa là công cụ chưa phân loại được, không phải giấy phép sử dụng. MapLibre, COLMAP, Meshroom cần đọc các file license và dependency của build được chọn. ODM/OpenMVS có AGPL: chưa tích hợp vào web client; đánh giá nghĩa vụ tại bước đóng gói pipeline.

## Điểm cần đính chính từ tìm kiếm

[README API Poly Haven hiện tại](https://github.com/Poly-Haven/Public-API) và [ToS](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md) cho phép API miễn phí cả thương mại. Một số bài blog cũ còn mô tả giới hạn phi thương mại, nên không dùng chúng để quyết định hiện tại. Ghi nguồn khi sử dụng live API và quyền asset CC0 là hai phạm vi khác nhau.

[ambientCG](https://docs.ambientcg.com/license/) cho phép đóng kèm asset CC0. [cgbookcase](https://www.cgbookcase.com/textures) công bố texture CC0. [Mapillary](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data) và [KartaView](https://kartaview.org/terms) có điều kiện ảnh CC-BY-SA; không coi đó là CC0. Chưa tải hàng loạt ảnh đường phố.

## Lộ trình đạt độ thật cao hơn

1. **Surface baseline — đợt này:** texture PBR đúng kênh màu, đơn vị mét cho UV mặt phẳng, A/B, bóng lá và nguồn asset đầy đủ.
2. **Hero architecture:** chọn 20 mặt đứng trên Nguyễn Huệ–Bạch Đằng; ảnh đúng địa điểm, dựng nhịp cửa/ban công/mái, chỉnh phối cảnh và bake atlas riêng. Loại các chi tiết thư viện không hợp kiến trúc địa phương.
3. **Vegetation & street assets:** 6–8 kiểu cây phù hợp hình thái quan sát, bó vỉa/vạch đường/biển báo theo ảnh; asset xa dùng instancing, cận dùng GLB có LOD. Không gắn cây theo loài khi chưa có chứng cứ.
4. **Lighting benchmark:** AO + anti-aliasing và cân bằng contrast trong một nhánh renderer thử nghiệm; đo ngày, giờ vàng, đêm ở cùng camera.
5. **Reality patches:** ảnh mặt đất nhiều góc trước khi có UAV; chạy SfM/MVS hoặc splat trên từng ô, kiểm camera, độ phủ và sai số với điểm kiểm tra.
6. **City streaming:** thay từng proxy bằng tile đã kiểm định, GLB/KTX2 có bounds và screen-space error. Semantic, collision và lớp đo lường được quản lý cùng nhưng độc lập với lớp hình ảnh.

### Tiêu chí nghiệm thu

- Ảnh A/B cùng camera, ánh sáng, viewport; kiểm cận cảnh và skyline, không chỉ đếm số tam giác.
- Không lỗi shader; mọi texture được giải mã, màu là sRGB, normal/roughness là linear.
- Leaf alpha và depth shadow khớp; tàu giữ tuyến sông và fallback ở LOD xa.
- Texture không có nguồn/license/sha256 thì không nhập bundle.
- Asset generic, inferred và observed-site có nhãn riêng; không tăng confidence map chỉ vì hình ảnh đẹp hơn.
- Bảng FPS là quan sát trên máy thử, không tuyên bố benchmark phổ quát.

## Tái lập

`python3 scripts/acquire_pbr_14.py` tải có giới hạn 5 asset qua URL trả về từ metadata chính thức; kiểm số byte archive, lưu hash map, nén JPEG q88 và nhúng bundle. Kích thước ảnh chữ nhật được giữ nguyên.

`python3 scripts/build_visual_registry_14.py` xây claims và trang tra cứu từ snapshot cục bộ. Chạy refinery/bites trong `research/` để kiểm bằng chứng và kiểm thử lỗi giả. Gate CAPTURE_MISSING đã được sửa để xóa **snapshot được claim tham chiếu** trên bản tạm, kể cả JSON/TXT, thay vì xóa ngẫu nhiên một HTML không sử dụng.

Các gói 3D mới ngoài texture và lớp lá tự dựng chưa được cài vào engine hiện hành. Mỗi ứng viên trong registry có trạng thái tích hợp để tránh lẫn “đã tìm được” với “đã vận hành”.

## Kiểm chứng đợt 14

- Bốn validator (surface 14, enrichment 13, cinematic UI, demo) đều PASS; kiểm cú pháp JavaScript PASS.
- Refinery xây lại tất định; 5 gate được cấu hình đều bắt lỗi giả. Các gate không được khai trong domain là N/A, không tính là đã kiểm.
- Browser: 15/15 texture nạp thành công, không thấy lỗi console/shader trong lượt kiểm. A/B tắt trả về 0 leaf card, bật có 24.000; chuyển toàn cảnh tự tắt LOD lá gần. Đã đi qua cảnh đêm và quay về ngày.
- Ảnh đối chứng trong outputs: `poc-fourteen-surfaces-golden.png`, `poc-fourteen-surfaces-no-pbr-golden.png`, kèm metrics. Quan sát 30 FPS ở phiên browser kiểm này; đây không phải benchmark tốc độ tuyệt đối.
- Danh mục tìm “splat” trả 3 kết quả; lọc asset_source trả 9. Bản HTML đóng gói 46 MB nạp đủ texture khi phục vụ qua localhost; không kiểm trực tiếp file:// trong lượt này vì browser policy.
- Script `capture_visual_sources_14.py --output THU_MUC_MOI` thu 30 endpoint sơ cấp với tối đa 4 request đồng thời, giữ snapshot cũ bất biến. Các metadata bổ sung và 12 ảnh tham chiếu được lưu trong bộ snapshot cùng hash.
