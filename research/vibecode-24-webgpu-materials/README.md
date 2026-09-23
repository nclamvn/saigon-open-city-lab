# PoC 24A — Three.js WebGPU Material Engine

## Kết quả

PoC 24A bổ sung một renderer độc lập cho toàn vùng mô hình 38,57 km². Cảnh dùng Three.js r186 `WebGPURenderer`, TSL/NodeMaterial và WebGL 2 fallback. Toàn bộ 70.726 khối công trình dùng một vật liệu nút thống nhất với thuộc tính theo đỉnh cho màu nền, loại bề mặt, họ vật liệu, seed ổn định và trạng thái có/không có thẻ nguồn.

Mở:

`http://127.0.0.1:8768/hcmc-poc/webgpu-materials-24.html?v=24e&view=bason`

## Những gì được thực hóa

- 8 họ vật liệu: phổ thông, nhà ở, kính thương mại, công cộng, công nghiệp, trung tâm, tôn giáo và hỗn hợp.
- Màu `building:colour`, `roof:colour` và vật liệu trực tiếp được ưu tiên; màu quá bão hòa được nén để giữ toàn cảnh tự nhiên.
- Nhịp tầng, nhịp khoang, ô kính, băng tầng trệt, phong hóa tường, màu mái và độ nhám được dựng bằng TSL.
- Chi tiết mặt đứng tự mờ dần theo khoảng cách để tránh nhiễu và rung ở toàn cảnh.
- Ban đêm chỉ một tỷ lệ nhỏ ô cửa phát sáng, cường độ thấp; đây là mô phỏng occupancy, không phải dữ liệu chiếu sáng đo được.
- Đường, vạch trục, nước PBR, cây hai tầng tán và thiết bị mái được dựng lại trong cùng cảnh.
- Thanh “Độ thực hóa” và thao tác giữ nút A/B cho phép so sánh cùng camera với khối nền.

## Ranh giới bằng chứng

Mới có 74 công trình mang thẻ màu/vật liệu trực tiếp trong registry PoC 08. Phần còn lại được suy luận từ loại công trình, cờ kính, chiều cao, vị trí trung tâm và ID ổn định. Shader không khẳng định số lượng hoặc vị trí cửa sổ thực. Phần lớn chiều cao còn ước lượng và hình học nền chủ yếu là footprint extrude.

## Kiểm tra

```sh
node outputs/hcmc-poc/scripts/qa-webgpu-materials-24.cjs
```

Đã kiểm tra trực tiếp trong trình duyệt: backend `WEBGPU / TSL`, 70.726 công trình, chế độ ngày/đêm, thanh A/B và các góc camera hoạt động. Số FPS trên HUD là cadence quan sát trong phiên trình duyệt; không phải benchmark GPU chuẩn hóa.
