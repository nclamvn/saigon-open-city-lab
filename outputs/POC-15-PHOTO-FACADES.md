# PoC 15 — Mặt đứng từ ảnh đúng địa điểm

Đợt 13/09/2026 · City Lab.

## Correction 15b — lỗi khớp lớp vỏ (13/09/2026)

**Phần này thay thế trạng thái triển khai 15a ở dưới.** Hiện có 14 dải ảnh phẳng, 1 vỏ Vietcombank dùng vật liệu lấy mẫu từ ảnh, 5 công trình giữ ảnh đối chiếu nhưng chưa phủ lên 3D.

Nguyên nhân được tái hiện từ ảnh người dùng: crop Vietcombank đi qua góc hai mặt nhà, còn chứa biển hiệu SUTRA của công trình phía trước. Đồng thời override đã kéo footprint khối đế 402859385 từ 9 m lên 206 m. Đây là lỗi cách chọn bề mặt và bộ phận, không phải thiếu độ phân giải hay lỗi tải ảnh. Kiểm tra 15a chỉ xác nhận nguồn/quad lồi/tọa độ, không đủ phát hiện lỗi này.

Sửa 15b:
- Giữ khối đế 9 m. Dùng sáu footprint bộ phận 1151203205–1151203210 cho các bậc 154/164/174/185/197/206 m. Các cao độ trung gian là **ước lượng từ ảnh**, chỉ mốc tổng thể 206 m có nguồn đã lưu.
- Cắt lại ảnh, chỉ giữ một mặt phẳng sạch. Bỏ mesh decal cũ; lấy mẫu cửa từ ảnh để phủ liên tục lên các bộ phận. Vật liệu có lặp và phản chiếu UV để liền biên, **không đại diện đúng vị trí từng cửa hoặc từng tầng**.
- Đồng bộ UV theo mét khi chỉnh chiều cao; A/B và audit khôi phục cả tọa độ lẫn UV gốc. Kiểm tra runtime khẳng định khối đế vẫn 9 m.
- Chỉ bật dải ảnh khi đã rà soát nguồn một mặt phẳng và các pháp tuyến đích lệch không quá 5°. Thiếu review thì không phủ. Chặn override chiều cao của mọi khối `podium`.
- Tạm ngừng phủ UBND, Sun Wah, Renaissance, Grand và Hương Sen: cần chia mặt hoặc dựng bề mặt cong. Giữ đủ nguồn ảnh và hiển thị lý do trong UI; không xóa dữ liệu.
- Camera loại chính các bộ phận cùng tòa nhà khỏi danh sách vật cản. Atlas đệm bằng pixel biên thực cho cả màu và alpha.

Đối chiếu mới: `hcmc-poc/?v=15b&view=facades&facade=vietcombank`. Trạng thái `research/facades-15/validation.json` chỉ đếm capture khớp phiên bản hiện tại; ảnh 15a không còn được tính như kiểm chứng 15b.



Đã dựng 20 mặt đứng có vùng ảnh tham chiếu riêng cho 20 công trình trên trục Nguyễn Huệ–Bạch Đằng và những góc phố Đồng Khởi–Lam Sơn liền kề. Đây là các **dải mặt đứng gắn ảnh trên hình học gần đúng**, chưa phải 20 tòa nhà được tái dựng đầy đủ bằng photogrammetry.

## Xem và đối chiếu

- Mô hình: `http://127.0.0.1:8768/hcmc-poc/?v=15a&view=facades&facade=cafe42`.
- Góc nhìn 21: **20 mặt đứng từ ảnh**. Chọn công trình, Trước/Tiếp, bật/tắt ảnh cùng camera.
- Mở **Ảnh đối chiếu & nguồn** để xem ảnh chụp, tác giả, thời điểm, giấy phép và ghi chú hình học. Bảng này mặc định thu gọn.
- Gallery: `hcmc-poc/research/facades-15/index.html`; bản máy đọc: `manifest.json` và `selections.json` cạnh đó.

## Phương pháp đã thực thi

1. Truy vấn có giới hạn Wikimedia Commons, lưu metadata ảnh và URL gốc. Sau phản hồi 429, giảm còn một truy vấn đồng thời, chờ Retry-After hoặc tối thiểu 60 giây; giữ snapshot đã có để không tải lặp.
2. Nhìn ảnh để loại nội thất, công trình trùng tên ở nơi khác, ảnh xây dựng, ảnh quá khuất và ảnh không đủ xác định vị trí. 20 ảnh được chọn có giấy phép riêng; không coi cả Commons là CC0.
3. Chọn bốn góc của vùng mặt đứng, hiệu chỉnh phối cảnh bằng homography. Không dùng ảnh sinh, không inpaint phần khuất. Loại các vùng cây che được đánh dấu bằng alpha mask; phần còn lại vẫn có thể chứa bóng đổ, biển hiệu hoặc occluder nhỏ trong ảnh gốc.
4. Đóng 20 ô 500 × 500 pixel vào atlas 2048 × 2560 có đệm biên. Nhúng atlas màu, mask và ảnh tham chiếu thu nhỏ để mô hình không cần gọi API lúc chạy.
5. Gắn các dải mesh lên cạnh footprint được chọn, giữ hướng ảnh đọc đúng. Cây, camera, mặt nước và tuyến giao thông dùng hệ tọa độ hiện có. Ban công chung cư 42 có gờ tạo chiều sâu; các khung khác chỉ có mép gờ giới hạn, không tự suy diễn chi tiết trang trí bị khuất.
6. Góc nhìn chọn công trình thử các vị trí camera để giảm việc nằm trong hoặc bị khối đối diện chắn. Có LOD; tắt lớp khi xem audit chiều cao. Ảnh nguồn, biến đổi và giấy phép đi kèm các lần lưu ảnh qua sidecar metrics.

## Hai loại độ đúng phải tách riêng

**Ảnh có nhận diện đúng công trình** không đồng nghĩa hình học đã đo đúng. Footprint vẫn theo dữ liệu mở; cách đặt UV, phạm vi dải ảnh, cao độ và độ sâu gờ còn được căn thủ công. Riverside Hotel gắn với một footprint chưa có tên, theo vị trí giữa Grand và Renaissance cùng ảnh/camera nguồn; đây là đối chiếu thủ công, chưa có khảo sát xác nhận.

Bốn hiệu chỉnh chiều cao chỉ thuộc lớp trình diễn và có thể hoàn nguyên:

- Vietcombank Tower: 206 m theo [The Skyscraper Center](https://www.skyscrapercenter.com/ho-chi-minh-city/vietcombank-tower/10275/). Dáng bao và phần đỉnh vẫn gần đúng; con số công bố không làm toàn bộ hình học thành khảo sát.
- Sheraton: 73,6 m, **ước lượng** 23 × 3,2 m từ thông tin [Marriott về tầng 23](https://www.marriott.com/en-us/hotels/sgnsi-sheraton-saigon-hotel-and-towers/overview/).
- UBND TP.HCM: 26 m, **ước lượng thị giác** để tránh kéo dẹt dải ảnh theo khối nền 9,6 m.
- Park Hyatt: 32 m, **ước lượng thị giác** từ số tầng trong ảnh và khoảng tầng giả định.

Nguồn `scene.json` không bị sửa. Khi tắt ảnh hoặc bật audit, tọa độ Y của các khối hiệu chỉnh được khôi phục; confidence của dữ liệu nền không được nâng lên chỉ vì có ảnh đẹp hơn.

Ảnh được chọn trải từ **2006 đến 2025**, không phải một bộ hiện trạng đồng thời năm 2026. Atlas ảnh đã có ánh sáng, bóng và phản xạ trong ảnh gốc; đổi giờ trong mô hình chỉ là relighting gần đúng, không phải vật liệu albedo đã được khử sáng chuẩn.

## Danh sách ảnh đã chọn

| # | Công trình / mặt đứng | Thời điểm ảnh | Giấy phép / nguồn |
|---|---|---|---|
| 01 | UBND TP.HCM | 2020-01-16 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City,_City_Hall,_2020-01_CN-03.jpg) · Steffen Schmitz (more photos) |
| 02 | Rex Hotel · mặt Lê Lợi | 2016-05-24 04:52 | [Public domain](https://commons.wikimedia.org/wiki/File:The_Rex_Hotel_Is_Pictured_While_Secretary_Walked_the_Streets_of_Ho_Chi_Minh_City_(27237284176).jpg) · U.S. Department of State from United States |
| 03 | Union Square | 2013-08-14 13:56:53 | [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Vincom_Center,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_02.JPG) · Diego Delso |
| 04 | Chung cư 42 Nguyễn Huệ | 2023-12-28 10:43:09 | [CC0](https://commons.wikimedia.org/wiki/File:42_Nguyen_Hue_Boulevard,_Saigon_(53547606514).jpg) · Werner  Bayer |
| 05 | Sun Wah Tower | 2013-08-14 14:05:47 | [CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Sun_Wah_Tower,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_01.JPG) · Diego Delso |
| 06 | Saigon Prince Hotel | Taken on 4 January 2024 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Saigon_Prince_Hotel.jpg) · Vano111ru |
| 07 | Saigon Times Square | 2020-01-16 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City,_Saigon_Times_Square,_2020-01_CN-01.jpg) · Steffen Schmitz (more photos) |
| 08 | Vietcombank Tower | 2020-01-16 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City,_Vietcombank_Tower,_2020-01_CN-01.jpg) · Steffen Schmitz (more photos) |
| 09 | Renaissance Riverside · khối đế | Taken on 12 May 2014 | [CC BY 3.0](https://commons.wikimedia.org/wiki/File:C%C3%B4ng_tr%C6%B0%E1%BB%9Dng_M%C3%AA_Linh-B%E1%BA%BFn_Ngh%C3%A9,_Qu%E1%BA%ADn_1,_TPHCM,_Vi%E1%BB%87t_Nam_Renaissance_Riverside_Hotel_Saigon_-_panoramio.jpg) · trungydang |
| 10 | Hotel Majestic · mặt Tôn Đức Thắng | 5 July 2023 (according to Exif data) | [CC0](https://commons.wikimedia.org/wiki/File:Hotel_Majestic,_Saigon_(20230705_1506).jpg) · Syced |
| 11 | Grand Hotel · cánh Đồng Khởi | 2023-02-01 09:30:20 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Hotel_Grand_Saigon_P1310935.jpg) · FredTC |
| 12 | Riverside Hotel | 2023-02-01 13:22:36 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Riverside_Hotel_P1310979.jpg) · FredTC |
| 13 | Hilton Saigon | 2022-01-30 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Hilton_Saigon_Hotel,_ph%C6%B0%E1%BB%9Dng_b%E1%BA%BFn_ngh%C3%A9,_qu%E1%BA%ADn_1,_tphcm.jpg) · Xuanphuocle |
| 14 | Nhà hát Thành phố · mặt chính | 2016-11-19 12:37:34 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_Opera_House.jpg) · HĐ |
| 15 | Caravelle · cánh thấp Lam Sơn | 2014-02-18 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Caravelle_Hotel_Saigon_2013-02.jpg) · BaonguyenCaravelas |
| 16 | Hotel Continental Saigon | 2018-12-30 15:38:18 | [CC BY 2.0](https://commons.wikimedia.org/wiki/File:Hotel_Continental_Saigon_(53668610570).jpg) · Hans Brian Brandsberg Berg |
| 17 | Sheraton Saigon · mặt Đồng Khởi | 2025-01-01 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Sheraton_Saigon_Hotel_from_Coffee_-_1_Jan_2025.jpg) · MinhKhoi1234 |
| 18 | Hương Sen · cánh Đồng Khởi | 2017-09-03 23:45 | [CC BY 2.0](https://commons.wikimedia.org/wiki/File:Huong_Sen_Hotel_(36327771544).jpg) · Terrazzo from Vernon Hills, IL, USA |
| 19 | Royal Hotel Saigon | 2023-02-01 09:54:33 | [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Royal_Hotel_Saigon_P1310937.jpg) · FredTC |
| 20 | Park Hyatt Saigon · quảng trường Lam Sơn | 2006-09-20 14:58 | [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Park_Hyatt_Saigon.jpg) · Joshua Rappeneker from Tokyo, Japan |

## Kiểm chứng và tái lập

- Đã mở và lưu ảnh kiểm tra cả 20 công trình; một số góc phải nâng camera để nhìn qua nhà đối diện. Không tuyên bố mọi mặt đứng đều nhìn trọn từ góc chọn sẵn.
- Validator kiểm 20 khóa và 20 ID công trình riêng biệt, giấy phép khớp metadata nguồn, hash ảnh, tứ giác chọn ảnh lồi, cạnh mesh khớp footprint, và byte atlas nhúng giống file gốc.
- Browser nạp đủ atlas màu + mask; không thấy lỗi console/shader trong lượt kiểm. Audit làm `visible=false` và `heightOverridesActive=false`; đã thử chuyển ngày–đêm. FPS là số quan sát theo camera/máy, không phải benchmark phổ quát.
- Đối chứng `poc-fifteen-facades-cafe.png` và `poc-fifteen-facades-cafe-no-photo.png` nằm trong outputs, kèm metrics và attributions.

Từ thư mục `hcmc-poc`, trong môi trường Python có Pillow:

```sh
python3 scripts/download_selected_facades_15.py
python3 scripts/build_facades_15.py
python3 scripts/validate_facades_15.py
python3 scripts/package_single.py
```

`selections.json` là đầu vào căn ảnh có thể rà và chỉnh. `build_facades_15.py` xây lại từ dữ liệu đã lưu, không cần mạng. Các ảnh gốc/cắt/atlas giữ điều kiện giấy phép theo từng nguồn; khi phân phối sản phẩm hoặc ảnh chụp màn hình phải kèm attributions và điều kiện tương ứng.

## Bước nâng chất lượng tiếp theo

Thu ảnh chính diện mới và ảnh xiên cho từng công trình trong danh sách, ưu tiên khối phố được demo. Dùng chúng để thay các dải ảnh còn khuất, tách cửa/kính/ban công thành mesh, đo chiều cao và độ sâu, rồi bake albedo/normal/roughness riêng. Với bộ ảnh hiện có, chưa đủ căn cứ dựng chi tiết toàn bộ mái, mặt sau hay nội thất.
