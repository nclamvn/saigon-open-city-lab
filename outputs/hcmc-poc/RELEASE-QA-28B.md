# Release QA 28B

## Kết quả

City Lab 28B đã chuyển sang hình học đô thị phân cấp theo camera và depth-aware presentation pipeline. Kiểm tra trình duyệt ngày 27/09/2026 xác nhận cả WebGPU và WebGL 2 fallback đều khởi tạo thành công, không có console error.

| Chỉ số quan sát | Kết quả |
|---|---:|
| Mesh | 150 |
| Tam giác ở hero view | khoảng 9,0 triệu |
| WebGPU | 120 FPS quan sát |
| WebGL 2 fallback | khoảng 110 FPS quan sát |
| Phương tiện đường bộ | 3.200 |
| Tàu/thuyền | 22 |
| Mẫu tàu ngoài thủy hệ | 0 |
| Sai hướng wake | 0 |

FPS là số quan sát trên máy kiểm tra, không phải cam kết cho mọi thiết bị.

## Cổng tự động

| Suite | Kết quả |
|---|---:|
| `qa-app-integrity-28b.cjs` | 10/10 |
| `qa-construction-change-23.cjs` | đạt |
| `qa-flood-25a.cjs` | 7/7 |
| `qa-project-hygiene.cjs` | 8/8 |
| `qa-webgpu-materials-24.cjs` | 18/18 |

## Gate thị giác

- Hero/district/city LOD chuyển theo khoảng cách camera.
- Parapet và rooftop plant làm rõ silhouette mái.
- Gờ mặt đứng, mái che và street lamp tạo tỷ lệ ở cận cảnh.
- Ba facade kit procedural chính thay nhịp cửa theo loại công trình; hero zone có podium cornice và lightbox tầng trệt.
- Depth micro-contact không tạo viền đen rõ ở đường chân trời trong các view đã kiểm tra.
- Ba Son, Marina Central, Grand Marina, phương tiện và wake vẫn hiện diện sau nâng cấp.
- Wake không còn rectangular prop wash, additive blending hoặc đoạn ngang cứng; ba dải V được fade độc lập và đặt sát mặt nước.
- Giao diện giữ map-first shell và không tăng thêm bảng điều khiển.

## Giới hạn công bố

Chi tiết Runtime 28 là `inferred presentation geometry`. Đây chưa phải ảnh mặt đứng khảo sát, BIM, photogrammetry hay 3DGS. Các vùng hero cần được thay dần bằng asset có provenance khi có quyền sử dụng.
