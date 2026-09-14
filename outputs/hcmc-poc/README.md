# Sài Gòn City Lab — Digital Twin Core 18

## Bản hiện hành 18 — ảnh, địa hình và LOD theo vùng

Mở [toàn cảnh ban ngày](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=overview). Trong Khám phá chọn **Ảnh & địa hình**, hoặc mở [surface18](http://127.0.0.1:8768/hcmc-poc/?v=18b&view=surface18). Đã có Sentinel RGB ngày 26/04/2026, GEDTM v1.2 ground/uncertainty và DSM riêng; 189 mảnh công trình với hai mức GLB, đọc COG trong Worker và tải mô hình có ngân sách.

Chạy `python3 outputs/hcmc-poc/serve.py` từ thư mục dự án; phải dùng máy chủ Range đợt 18, giữ cả thư mục `../shared/digital-twin-core/`. Bản HTML độc lập lịch sử không có các công cụ 17/18. Nền cũ vẫn nạp lúc startup và được khôi phục khi về bản đồ nền hoặc Phân tích. Đợt này chưa chuyển viewer Gia Lộc.

Ảnh nguồn 10 m/địa hình mô hình khoảng 31 m không thay khảo sát cm hay LiDAR. Fine/coarse là LOD hiển thị, chưa là CityGML LoD2/3. COPC/SfM/3DGS và geometry quy hoạch giữ điều kiện triển khai. [Runbook 18](../DEMO-18-HUONG-DAN.md) · [Kiến trúc và nguồn 18](../../research/vibecode-18/ARCHITECTURE-AND-SOURCES.md) · [Verify 18](../../research/vibecode-18/VERIFY.md).


## Lịch sử bản 17 — lõi nguồn và phân tích dùng chung

Mở [City Lab TP.HCM](http://127.0.0.1:8768/hcmc-poc/?v=17b&view=overview). Bản 17 chạy qua HTTP và dùng `../shared/digital-twin-core/`; cần bàn giao cả hai thư mục. `SAIGON-3D.html` là gói lịch sử trước đợt này, chưa chứa công cụ Phân tích mới.

Từ thư mục dự án, chạy `python3 outputs/hcmc-poc/serve.py` nếu server chưa chạy. Mặc định tổng quan ban ngày. Chọn **Phân tích → Mẫu hành lang Nguyễn Huệ** để thử A/B/C 25/50/100 m; thu gọn bảng để xem toàn bản đồ. Mở **Phạm vi & khoảng cách** để tự vẽ vùng/tuyến, bấm Enter kết thúc, Escape hủy. Kết quả có nhóm ID nguồn, diện tích hợp loại phần chồng và lớp đối tượng chọn; chuyển A/B/C giữ góc nhìn. **Xuất kết quả & lưu đối chiếu** tải JSON/CSV/HTML có hình học, nguồn, epoch, hash và phương pháp.

Lõi kiểm hash byte JSON và chạy chuẩn hóa/truy vấn trong Worker. Phân tích hiện dùng mặt bằng và chiều cao mô hình, nền HCMC vẫn phẳng. Các số liệu là ước lượng sàng lọc; số ID nguồn chưa phải số nhà/thửa kiểm chứng. Cấu hình Gia Lộc dùng cùng lõi; UI Gia Lộc chưa chuyển sang plugin này. Chưa có orthophoto 1 cm, LiDAR đo kiểm hoặc hình học quy hoạch tương lai được duyệt mới trong đợt 17.

Hướng dẫn demo: [DEMO-17-HUONG-DAN.md](../DEMO-17-HUONG-DAN.md). Kiến trúc và nguồn sơ cấp: [ARCHITECTURE-AND-SOURCES.md](../../research/vibecode-17/ARCHITECTURE-AND-SOURCES.md). Hợp đồng API và lệnh tiếp nhận: [README lõi](../shared/digital-twin-core/README.md). Nghiệm thu: [VERIFY.md](../../research/vibecode-17/VERIFY.md).

Kiểm lại lõi bằng `node --test outputs/shared/digital-twin-core/tests/*.cjs` từ thư mục dự án; kiểm catalog và hash bằng `python3 outputs/shared/digital-twin-core/scripts/prepare-project.py --check` và `node outputs/shared/digital-twin-core/scripts/project-data.cjs verify hcmc`.

Phần dưới ghi lịch sử giao diện và pipeline trước đợt 17.

## Giao diện lãnh đạo

Bản **16b**: nền kính khói, nav/drawer cùng bề rộng, nội dung so sánh thu gọn; cache bóng và giảm lượt phản xạ, chất lượng tạm giảm khi di chuyển rồi khôi phục. Mở `?v=16b`. Phép đo Chrome cùng cảnh cho CPU frame7,77→3,94ms; FPS đứng yên chưa tăng rõ. Xem `research/vibecode-16b/VERIFY.md` để biết điều kiện đo và giới hạn.

Mở `http://127.0.0.1:8768/hcmc-poc/?v=16a` để vào toàn cảnh ban ngày với bốn tác vụ **Khám phá / Quy hoạch / So sánh / Tham quan**. Bảng thông tin thu gọn; nút Nghiên cứu mở công cụ PoC cũ. URL có `view` cụ thể vẫn giữ góc được yêu cầu. UAV được hoãn và ẩn trong giao diện lãnh đạo.

Quy hoạch có bốn đầu mối nguồn kèm cơ quan, ngày, trạng thái và giới hạn; chưa có lớp hình học tương lai được đối chiếu. So sánh hiện dùng mô hình nền và lớp ảnh công trình, không phải hiện trạng–quy hoạch. Kiểm kê đủ 20 mục, giữ 5 mặt chưa đủ điều kiện; sửa metadata footprint Union Square và Continental đúng nguồn Overture. Xem `research/vibecode-16/VERIFY.md`, `research/vibecode-16/SCAN-GEOMETRY.md` và `../DEMO-16-HUONG-DAN.md`.

Phần bên dưới ghi lại nền tảng và các công cụ nghiên cứu được giữ từ các phiên bản trước.

## Xem kết quả

Mở `../SAIGON-3D.html` bằng Chrome/Safari có WebGL. Bản này nhúng dữ liệu, ảnh và thư viện; font ngoài có fallback. Máy không cần key API. Các liên kết tài liệu/nguồn vẫn cần Internet hoặc thư mục bàn giao tương ứng.

Hoặc chạy từ bất kỳ thư mục nào:

```sh
python3 /duong-dan/hcmc-poc/serve.py
```

Sau đó mở http://127.0.0.1:8768/hcmc-poc/?v=15a . Server chỉ bind loopback. Bản demo bắt đầu ở “Toàn khu vực” với ánh sáng ban ngày để giới thiệu đầy đủ phạm vi 38,57 km²; Cinematic Night là cao trào ở góc 18; Reality Enrichment là góc kiểm tra chi tiết ở góc 19. Giao diện map-first chỉ giữ ba nút điều khiển thường trực. Dùng mũi tên hoặc WASD để di chuyển trên mặt phẳng, Q/E để xoay, +/- để zoom; `H` ẩn UI, `F` bật toàn màn hình, `0` đặt lại góc và `Esc` đóng lớp nổi. Chuột vẫn hỗ trợ kéo trái, kéo phải và cuộn. “Lưu góc nhìn” lưu PNG có attribution vào thư mục outputs chứa dự án; ở bản HTML độc lập, ảnh được tải về theo cơ chế của trình duyệt. Xem `../DEMO-RUNBOOK-POC-12.md` trước buổi trình diễn.

## Dựng lại từ dữ liệu đã lưu

Tạo môi trường Python riêng và cài requirements.txt, sau đó:

```sh
python scripts/prepare_scene.py
python research/refinery.py research
python research/bites.py research
```

Script prepare_scene đọc bản OSM và Overture đã lưu; không gọi mạng. `scene.json` và `scene.js` là dữ liệu suy ra, không phải nguồn gốc. Các builder 07B–10 dựng lại tile GLB, kế hoạch thu ảnh, registry vật liệu, texture atlas và lớp chi tiết đô thị; các validator cùng tên kiểm tra từng đầu ra. Để đóng gói lại một file sau thay đổi, chạy `python scripts/package_single.py`.

## Thu thập đợt mới

Tạo bản sao thư mục trước khi tải mới để giữ nguyên snapshots của đợt cũ. `scripts/fetch_osm.py`, `fetch_ground.py`, `capture_sources.py` ghi file đích; không chạy chúng lên bản lưu trữ bất biến.

Lệnh Overture đã dùng:

```sh
python -m overturemaps download --bbox=106.684,10.750,106.739,10.808 -f geojson --type=building -o data/overture-region.geojson
```

Client chọn release theo catalog khi tải mới; file `.state` ghi release thực tế. Đợt bàn giao sử dụng 2026-08-19.0. Không coi “latest” là cố định.

## Nguồn và quyền

OSM: https://www.openstreetmap.org/copyright — ODbL, attribution; dữ liệu suy ra từ OSM được bàn giao để hỗ trợ nghĩa vụ share-alike. Overture có các nguồn Google Open Buildings, Microsoft ML Buildings và OSM; giữ `sourceRecords`, đọc giấy phép theo nguồn/theme: https://docs.overturemaps.org/attribution/ . Không tuyên bố tất cả nội dung Overture cùng một giấy phép permissive.

EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017), CC BY 4.0. Không dùng các bản EOX 2018–2025 có hạn chế NC.

Three.js MIT và Earcut ISC: giấy phép trong vendor/. Mã PoC do dự án tạo có thể chỉnh sửa; các giấy phép dữ liệu vẫn áp dụng riêng. Ảnh minh họa xuất từ scene phải giữ attribution ở chân ảnh.

## Các giả định

Xem báo cáo tổng. Nền phẳng; hầu hết chiều cao ước lượng; cây, vật liệu, texture atlas, thiết bị mái, dải hiệu, ánh sáng, đế, bó tháp Landmark 81 và sân đáp Bitexco có phần minh họa. Đây không phải bản đồ cho điều hướng UAV. Khoảng trống dữ liệu được giữ rõ trong giao diện và report.

## PoC 13

Chọn góc nhìn **19 · Reality Enrichment** để xem batch chi tiết cự ly gần và dùng nút A/B trong HUD để so với khối nền.

## PoC 14 · Surface Realism

Góc nhìn 20: năm bộ PBR ambientCG CC0, 15 texture và 1.200 tán cây cutout ở vùng gần. Nút PBR cho phép so sánh bật/tắt. Vật liệu thư viện chưa phải ảnh chụp bề mặt tại TP.HCM. Danh mục 27 giải pháp nằm tại `research/visual-14/index.html` trong ứng dụng; báo cáo tại `../POC-14-VISUAL-RESEARCH.md`.

## PoC 15 · Photo Facade Lab

Góc 21 bổ sung 20 mặt đứng từ 20 ảnh đúng công trình, với lựa chọn công trình, đối chiếu ảnh nguồn và A/B. Xem `../POC-15-PHOTO-FACADES.md` và gallery `research/facades-15/index.html` trong ứng dụng. Phần khuất, vị trí UV và độ sâu vẫn gần đúng; ảnh nguồn có thời điểm 2006–2025.

### Bản sửa 15b

Giữ 14 dải ảnh phẳng và vỏ Vietcombank theo footprint bộ phận với vật liệu lấy mẫu; 5 mặt không phẳng chờ tách bề mặt. Cấm kéo cao khối đế; A/B khôi phục cả hình học và UV. Xem phần Correction 15b trong `../POC-15-PHOTO-FACADES.md`.
