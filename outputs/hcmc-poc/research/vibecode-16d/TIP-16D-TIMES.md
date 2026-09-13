# TIP-16D-TIMES — lớp ảnh và nhận diện Times Square

User yêu cầu phủ mặt nhà liền mạch, chữ Times Square đọc được. Contractor đã đối chiếu ảnh original và phê duyệt hướng dedicated texture, crop mặt phẳng chính cùng cao độ, cùng finish kính suy dựng cho phần khuất. Draft đã được nhìn và chấp thuận.

## Scan hiện trạng

- Target times / OSM165491082; nguồn Steffen Schmitz, 16/01/2020, CC BY-SA4.0.
- Source local `assets/facades15/times-2.jpg`:1280×1871. Rectification hiện bị thu vào tile500×500; chữ gốc mất chi tiết qua downsample và perspective transform.
- Crop `[.316,.217],[.616,.084],[.662,.48],[.28,.477]`; vertical `[.48,.98]`. Ảnh nguồn bị công trình phía trước che gần hết phần thấp, không cung cấp fullfront thực.
- Mái nhìn thấy có bậc; quadrilateral cũ nối hai cao độ mái khác nhau, các góc dưới không dựa trên điểm đo. Không dùng một lần kéo giãn để biến thành toàn mặt đứng chính xác.
- Alternate local times-5.jpg là giai đoạn thi công, không phù hợp thay cho hiện trạng.

## Phương án được duyệt

1. Tải original Commons được cấp phép; dùng crop có cùng lưới mặt đứng và chứa trọn chữ gốc. Không AI tạo chữ, không chồng font giả thành ảnh thật.
2. Texture riêng có độ phân giải phù hợp cho Times để không bị giới hạn atlas500px; giữ nguyên bản gốc/hash/giấy phép và mô tả rectification.
3. Vùng chưa quan sát dùng finish kính đồng nhất lấy mẫu từ ảnh, ghi rõ inferred; không kéo ảnh chứa chữ xuống toàn thân hoặc bịa cửa/kiến trúc phần khuất.
4. Giữ clipping16c trùng UV/mask/gate, A/B restore và tối ưu16b. Không đổi height hoặc footprint.

## Acceptance dự kiến

- AC1 nguồn original và vùng chữ đối chiếu được, hash/giấy phép/ngày chụp đầy đủ.
- AC2 chữ render dùng pixel nguồn gốc với texture riêng, không text tái tạo không công bố.
- AC3 finish ngoài vùng ảnh ghi inferred và không còn generic green bands; không mô tả đó là ảnh hiện trạng đủ toàn công trình.
- AC4 clipping/mask/AB/heightUV vẫn đúng; các target khác không đổi.
- AC5 shader/runtime/packaging/validators và browser source-vs-render, góc xiên, A/B được kiểm tra.
