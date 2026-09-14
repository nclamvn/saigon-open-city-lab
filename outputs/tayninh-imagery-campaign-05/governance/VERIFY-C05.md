# VERIFY-C05 — Contractor /root

Ngày kiểm: 14/09/2026. Phạm vi nghiệm thu: nghiên cứu nguồn dữ liệu, thử lấy dữ liệu có giới hạn và hồ sơ tra cứu; không nghiệm thu bản đồ chân thực hoặc độ chính xác khảo sát.

Địa chỉ bàn giao: http://127.0.0.1:8768/tayninh-imagery-campaign-05/?v=c05-final

## Coverage yêu cầu

| ID | Kết quả | Bằng chứng chính |
|---|---|---|
| C05-O01 | PASS | 11 records nguồn ảnh, primary snapshots và báo cáo optical |
| C05-O02 | PASS | Exact/wider AOI OAM/HOTOSM, provider receipts và blocker có ghi rõ |
| C05-O03 | PASS | Grid nguồn 0,5 m / effective 4 m / crop 4 m tách biệt; date, license và quyền truy cập |
| C05-O04 | PASS | Google crop, source manifest, script tái lập, QA và Completion |
| C05-L01 | PASS | Nghị quyết1682 đúng Gia Lộc Tây Ninh; giữ bbox kỹ thuật, không gọi là ranh pháp lý |
| C05-L02 | PASS | NRSD SPOT6, cổng địa phương, DOSM/VNSDI, TEDI và ảnh mặt đất đã kiểm |
| C05-L03 | PASS | Coverage/access/rights độc lập; ảnh chưa định vị không gắn lên map |
| C05-L04 | PASS | 10 records, 29 receipts, báo cáo local và hành động lấy dữ liệu tiếp |
| C05-T01 | PASS | 12 nhóm kỹ thuật và một input GEDTM; 39 nhóm primary, 107 snapshots |
| C05-T02 | PASS | Chi tiết suy luận/SR/3DGS tách khỏi quan sát và độ chính xác đo đạc |
| C05-T03 | PASS | Chẩn đoán renderer và lộ trình P05A–E trước Hera |
| C05-T04 | PASS | Báo cáo techniques, source records, evidence và Completion |
| C05-R01 | PASS | Báo cáo đọc tại trang, 4 bảng HTML, tìm kiếm/lọc và mở/thu gọn |
| C05-R02 | PASS | 35 IDs duy nhất, 230 evidence references, 235 hash checks; 4 bites đúng kỳ vọng |
| C05-R03 | PASS | 0 high-res RGB dùng ngay; 2 nguồn raster mô hình; 3 gói thực thu gồm ảnh tham chiếu |
| C05-R04 | PASS | Root browser desktop/mobile390, 5 ảnh tải được, 12/12 HTTP smoke; upstream không đổi |

Coverage: **16/16 yêu cầu (100%)** trong phạm vi nghiên cứu đã giao. Số nguồn và lượt hash không phải số dataset phù hợp AOI hoặc bằng chứng độ chính xác.

## Scenario verification

| Scenario | Kết quả / số đo | Severity còn mở |
|---|---|---|
| S01 lấy mẫu nhà | 657 footprint; trung vị106,21 m²; 617 <400 m²; 1,0621 pixel diện tích ở10 m | Không |
| S02 Google crop | 823×833, 3 bands, EPSG32648, grid4 m, 685.559 valid; bounds và edge trim có QA | Không |
| S03 GEDTM | Native109×109 Float32 DTM/RF spread, datum EGM2008; đủ11.881 pixels; raw Range13.238.272 bytes | Không |
| S04 NRSD | Row13: 3 cảnh tổng, 1 cảnh <25% mây; lịch đặt chụp khác ngày thu; AOI footprint chưa có | Không: giới hạn đã công bố |
| S05 Planet/NICFI | Chính sách hiện hành kiểm từ primary; không gọi free business/government export | Không |
| S06 OpenTopography | Exact bbox15 Raster/0 PointCloud; không suy ra universal absence | Không |
| S07 registry | Root validator35 IDs/230 references/235 hashes, 0 lỗi | Không |
| S08 adversarial bites | Valid PASS; duplicate ID/hash corrupt/missing file FAIL đúng code:4/4 | Không |
| S09 tìm kiếm | Google2, optical11, chuỗi không khớp0; empty-state có thông báo | Không |
| S10 đã thu tệp | Filter3 gói: Google, Commons, GEDTM; GEDTM downloadable=true | Không |
| S11 report/evidence | Mở/thu gọn hoạt động;4 tables; Commons/OpenSR URLs nguyên vẹn | Không |
| S12 viewport | Desktop1440 không tràn; mobile390 documentWidth390 với35 records/report mở/5 ảnh tải; badge≤27,05 px desktop | Không |
| S13 HTTP | 12/12 status200: HTML/JS/CSS/font/registry/report/5 previews/Batch04 | Không |
| S14 syntax | JS1/1 và Python3 scripts compile đạt | Không |
| S15 upstream | 7 Batch04/source fingerprints được validator techniques giữ nguyên; không tích hợp renderer mới | Không |

**15/15 scenario đạt.** Lỗi major trong bản nháp đã sửa và kiểm lại: mobile tràn480 px, markdown table thô, link Commons bị cắt và OpenSR có dấu cách. Lỗi dữ liệu/ngữ nghĩa đã sửa: chính sách NICFI cũ, SPOT cloud count, Google crop coverage/grid, `not_acquired` phân loại nhầm, GEDTM thiếu liên kết asset trong inventory. Badges phình khi mở evidence đã sửa.

## Technical health và lệnh kiểm

- Registry: 235 lượt kiểm hash;0 lỗi,35/35 IDs duy nhất.
- Bites:4/4 đúng kỳ vọng; không sửa evidence thật để làm fixture.
- Techniques validator:13 records/39 primary groups/107 snapshots/136 unique hash files;0 lỗi tại lần Root kiểm nguồn.
- Python syntax:3/3 scripts; JS syntax:1/1. HTTP12/12. `git diff --check` đạt cho tracked diff; C05 là artifact chưa track.
- Build/typecheck/lint: N/A. Sản phẩm là static HTML/CSS/JS và Python utilities, không có compiler TypeScript/bundler/lint configuration. Không suy diễn syntax check thành kiểm lỗi runtime toàn bộ.

```sh
python3 outputs/tayninh-imagery-campaign-05/scripts/validate_inventory.py --root outputs/tayninh-imagery-campaign-05
python3 outputs/tayninh-imagery-campaign-05/scripts/run_bites.py --root outputs/tayninh-imagery-campaign-05
python3 outputs/tayninh-imagery-campaign-05/evidence/techniques/validate-research.py
python3 -m py_compile outputs/tayninh-imagery-campaign-05/scripts/build_inventory.py outputs/tayninh-imagery-campaign-05/scripts/validate_inventory.py outputs/tayninh-imagery-campaign-05/scripts/run_bites.py
node --check outputs/tayninh-imagery-campaign-05/static/app.js
git diff --check
```

Final inventory SHA256: `6a1dda7c64100cb7ace55b5f2f4fefe9a0c6038fd598f1213345008d360cbe56`.
Final synthesis SHA256: `52865d16c874cdd8c172141eecc298264da11b5477eba1ff0b1dcfbd0d62f71a`.

## Readiness

**Sẵn sàng bàn giao hồ sơ nghiên cứu và kho dữ liệu thử.** Local server8768 đang phục vụ artifact. Không có blocking code issue còn mở trong phạm vi này.

Ảnh RGB dưới mét có thể tải/tái dùng miễn phí đúng AOI chưa được xác minh trong các kho đã kiểm. Google height và GEDTM là mô hình, chưa phải khảo sát Gia Lộc; ảnh Commons chưa đủ vị trí để phủ công trình. Vì vậy map hiện hành chưa đạt chi tiết từng nhà, GSD1cm, LiDAR hoặc cây cá thể. Đây là thiếu input cho phase sau, không được ghi thành đã đạt.

Tiếp theo P05A: tỷ lệ nền1×, kiểm foundation/native texture. P05B: đối chiếu height/DTM có masks và datum. P05C: mái/PBR/cây mô phỏng có nhãn. P05D cần ảnh đúng công trình; P05E cần scene metadata/rights từ chủ quản. Chưa liên hệ bên ngoài, mua ảnh, tạo UAV phase hoặc commit/push.

Quyết định quy trình: dùng TIP/Completion/Verify, bỏ checkpoint kiến trúc/ship vì đây là công việc nghiên cứu cộng thêm đã được người dùng cho phép, không thay kiến trúc hay phát hành bên ngoài.
