# Release QA 27A

## Kết quả

- WebGPU/TSL tải thành công trên bản demo canonical.
- Cảnh toàn vùng: khoảng 47–55 FPS trong phiên kiểm tra tương tác.
- Cảnh Nguyễn Huệ: khoảng 55–65 FPS sau khi camera ổn định.
- Console trình duyệt: không có error hoặc warning.
- Camera chuyển toàn cảnh → ven sông → Nguyễn Huệ liên tục, không snap.
- Chế độ ngày và đêm được kiểm tra trực quan; bầu trời đêm chuyển tối, mặt đường và mặt nước giữ phân lớp.
- Tất cả năm bộ `qa-*.cjs` đạt.

## Bộ kiểm tra máy

| Suite | Kết quả |
|---|---:|
| `qa-app-integrity-27a.cjs` | 10/10 |
| `qa-webgpu-materials-24.cjs` | 18/18 |
| `qa-flood-25a.cjs` | 7/7 |
| `qa-project-hygiene.cjs` | 8/8 |
| `qa-construction-change-23.cjs` | đạt |

## Giới hạn còn lại

- Hậu kỳ dùng highlight spread nhẹ, chưa phải temporal SSGI/SSR đầy đủ.
- HLOD công trình vẫn dựa trên footprint extrusion; cận cảnh thực địa cần ảnh mặt đứng hoặc photogrammetry có quyền sử dụng.
- LOD cây chuyển theo camera scale toàn cảnh, chưa phân tile theo khoảng cách từng instance.
- Camera collision với từng công trình chưa bật cho chế độ orbit; preset đã giữ khoảng cách an toàn.
- Các số FPS phụ thuộc GPU, độ phân giải và backend của máy trình diễn.
