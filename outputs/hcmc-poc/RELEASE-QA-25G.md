# Release QA 25G

Ngày kiểm tra: 24/09/2026. Phạm vi: shell WebGPU hiện hành tại `webgpu-materials-24.html?v=25g`.

## Kết quả

- 5 bộ QA hiện hành vượt qua 42 kiểm tra: integrity, project hygiene, vật liệu WebGPU, Flood Lab và Construction Change data. Các kiểm tra khóa Visual 26, Urban Motion 26B và chính sách dọn workspace vào sương có giới hạn, PBR theo lớp, giao thông bám tim đường, tàu nằm trong polygon nước và không còn residue có thể tái tạo.
- `node --check` vượt qua cho renderer, Flood Lab và entry module.
- Trình duyệt thật khởi tạo bằng WebGPU, không ghi warning/error vào console.
- Bốn góc nhìn (`overview`, `river`, `boulevard`, `bason`) và ba trạng thái ánh sáng hoạt động, URL và trạng thái active đồng bộ.
- Một hệ màu trên cao duy nhất là mặc định: không còn nút, trạng thái lưu hay tham số URL `grade`; màu cận/trung cảnh được tăng có giới hạn và lớp xa dịu theo sương.
- Ẩn/hiện toàn bộ UI, thu gọn/mở điều hướng, thu gọn/mở Flood Lab và chạy/dừng mưa hoạt động.
- Kịch bản xấu nhất đặt đúng giới hạn 200 mm, triều 1,80 m, cảnh báo đỏ và độ sâu proxy 50 cm.
- Desktop 1280×720 và mobile 390×844 không có va chạm giữa topbar, điều hướng, Flood Lab và HUD; chiều rộng tài liệu mobile đúng 390 px.
- Nút chữ đang hiển thị có cỡ tối thiểu 12 px và chiều cao 40–44 px; nút icon là 32 px.
- Visual Calibration chạy bằng shader/material và ánh sáng WebGPU, không phát sinh warning/error; bảng màu mái–tường–kính–cây–đường–nước đã được mở rộng từ tập ảnh trên cao có provenance.

## Dọn mã và tài sản

- Đã bỏ selector CSS của các thành phần cũ không còn trong DOM: engine badge, pulse, icon button cũ, nhãn mắt cũ và span icon cũ.
- Không có `.DS_Store`, file tạm, backup, log hay bản sao kiểu `* 2.*` trong cây demo.
- `python3 scripts/clean_workspace.py` mặc định dry-run; thêm `--apply` chỉ xóa cache, backup cục bộ, buffer tải từng phần và bản sao tile đã có trong allow-list. Script dừng nếu ứng viên là file Git đang theo dõi.
- Mọi tài sản local được HTML hiện hành tham chiếu đều tồn tại; cache key cùng họ `25g`.
- Các QA trình duyệt của shell 17/18 được giữ trong `scripts/archive/` như bằng chứng lịch sử và không còn nằm trong cổng phát hành 25G.

## Cổng phát hành

Chạy từ thư mục dự án:

```sh
for file in outputs/hcmc-poc/scripts/qa-*.cjs; do node "$file"; done
python3 scripts/clean_workspace.py
node --check outputs/hcmc-poc/webgpu-materials-24.js
node --check outputs/hcmc-poc/flood-ui-25.js
node --check outputs/hcmc-poc/webgpu-entry-24.js
```

Các bài kiểm tra lịch sử trong `scripts/archive/` chỉ dùng khi phục dựng đúng shell 17/18.
