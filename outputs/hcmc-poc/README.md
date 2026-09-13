# Sài Gòn Open City Lab — PoC 13

## Xem kết quả

Mở `../SAIGON-3D.html` bằng Chrome/Safari có WebGL. Bản này nhúng dữ liệu, ảnh và thư viện; font ngoài có fallback. Máy không cần key API. Các liên kết tài liệu/nguồn vẫn cần Internet hoặc thư mục bàn giao tương ứng.

Hoặc chạy từ bất kỳ thư mục nào:

```sh
python3 /duong-dan/hcmc-poc/serve.py
```

Sau đó mở http://127.0.0.1:8768/hcmc-poc/?v=13c . Server chỉ bind loopback. Bản demo bắt đầu ở “Toàn khu vực” với ánh sáng ban ngày để giới thiệu đầy đủ phạm vi 38,57 km²; Cinematic Night là cao trào ở góc 18; Reality Enrichment là góc kiểm tra chi tiết ở góc 19. Giao diện map-first chỉ giữ ba nút điều khiển thường trực. Dùng mũi tên hoặc WASD để di chuyển trên mặt phẳng, Q/E để xoay, +/- để zoom; `H` ẩn UI, `F` bật toàn màn hình, `0` đặt lại góc và `Esc` đóng lớp nổi. Chuột vẫn hỗ trợ kéo trái, kéo phải và cuộn. “Lưu góc nhìn” lưu PNG có attribution vào thư mục outputs chứa dự án; ở bản HTML độc lập, ảnh được tải về theo cơ chế của trình duyệt. Xem `../DEMO-RUNBOOK-POC-12.md` trước buổi trình diễn.

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
