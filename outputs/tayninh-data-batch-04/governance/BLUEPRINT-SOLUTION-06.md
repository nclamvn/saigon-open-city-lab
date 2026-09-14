# S06 — áp dụng C05 vào bản đồ hiện hành

Contractor /root, ngày14/09/2026. User yêu cầu RtR đầu tư logic/kỹ thuật và áp dụng các nguồn mới ngay trên map, không chờ payload Hera. Quyết định: nâng nền tảng hiện hành theo kiến trúc Source → normalized assets/QA → scene descriptors → layer renderer → trải nghiệm; giữ Three/local server và stable feature IDs. Đây là mở rộng đã được yêu cầu, không cần hỏi lại checkpoint. Không phát hành bên ngoài hoặc commit.

## Outcome / requirement matrix

| ID | Output |
|---|---|
| S06-D01 | C05 GEDTM native/uncertainty và Google presence/height thực sự vào supplement scene; source hashes/epochs/datum/grid/nulls |
| S06-D02 | Google sampling trong polygon/presence mask; missing/low support giữ proxy và measured_height=false |
| S06-D03 | GEDTM đăng ký vào frame hiện hành, masks/nodata/bounds minh bạch; không dùng DSM-DTM như cao nhà |
| S06-D04 | Compiler/adapter có contract/documentation để thay source tương lai; deterministic outputs + numeric QA/hash bites |
| S06-E01 | Defaultterrain1×, lựa chọn GEDTM thử nghiệm/COPDEM, dependentlayers re-ground đúng khi đổi nguồn |
| S06-E02 | Foundation từng đỉnh bám triangle terrain; independent raycast QA rõ construction vs verification |
| S06-E03 | Mái, mặt đứng, vật liệu PBR có chi tiết trên footprint; generic/modelled riêng, không dán ảnh chưa định vị |
| S06-E04 | Road ribbons bám địa hình; mô phỏng vegetation không theo ô lưới, tránh footprints/roads/water; canopy analytic riêng |
| S06-E05 | On-demand renderer/LOD/merged or instanced geometry, resource disposal, không allocation/raycast toàn bộ mỗi frame; perf probe |
| S06-E06 | Pick/provenance, keyboard/mouse/zoom/tour/selection vẫn hoạt động; boot/fallback lỗi source không biến thành data thật |
| S06-U01 | UI Inter/glass gọn/collapse, bố cục dành diện tích cho bản đồ; không overlap390px/desktop |
| S06-U02 | Controls minh bạch terrain source, model/proxy height, detail vs analytic vegetation; trạng thái sync khi đổi |
| S06-U03 | Guided focus cụm nhà và reset; source/epoch/resolution/models rõ trong inspector/drawer, linkC05 |
| S06-U04 | Browser-ready controls/accessibility và Completion theo đúng contract engine |

14 requirements. Data Builder độc lập scripts/derived/solution. Engine Builder app.js và renderer modules. UI Builder index.html/styles.css và UI-only module. Dependencies: engine consumes data supplement; UI consumes engine commands via buttons/custom event. Không cùng sửa một file. Contractor kiểm data và UI/browser, báo cáo Verify định lượng.

## Invariants

- AOI/B01-B03/raw C05 immutable; baseline fusion/visual artifacts không cần regenerate chỉ để đổi exag.
- Supplement chỉ modelled inputs, không sửa measured/source_height_m=null. Googleheight4m effective khác sourcegrid0.5m/crop4m.
- GEDTM2006–2015 testing-only EGM2008; COPDEMDSM không đất trần LiDAR; switch không khẳng định khảo sátaccuracy.
- Building geometry bám polygon; kiểu mái/cửa/màu/loài/vị trí cây chưa có ảnh/đo là generic modelling có nhãn.
- PhotoCommons chưa GPS không phủ công trình. RGBnative10m giữ nguyên; code detail không tự tạo dữ liệu quan sát mới.
- Không thêm UAV mission/flight features; payload chỉ input contract tương lai.

## Registration correction discovered during independent QA

Root phát hiện ba lỗi liên quan: GEDTM inverse transform lấy tọa độ góc pixel thay vì tâm; phép đổi ngược footprint từ scene dùng công thức khác compiler fusion; và bản thân geometry fusion dùng hệ số mét/độ ellipsoid trong khi terrain/UV visual dùng bán kính 6378137 m. Sai khác 7–8 m ở vùng nam có ý nghĩa với raster hiệu dụng 4 m.

Quyết định S06: lấy mẫu chiều cao từ polygon WGS84 gốc đã kiểm hash, không từ tọa độ scene đổi ngược bằng công thức giả định. Renderer dùng duy nhất canonical scene_coordinate_frame của visual; supplement cung cấp footprint/centroid canonical và phép chuyển geometry legacy cho đường, thủy hệ, ô phân tích. Terrain/UV và dữ liệu gốc giữ nguyên. D03/E01/E02 bao gồm kiểm chứng phép đăng ký này trước nghiệm thu, cùng quy tắc tâm pixel và hỗ trợ biên nằm trong raster. Không clamp điểm ngoài raster hoặc biến nodata thành độ cao 0.
