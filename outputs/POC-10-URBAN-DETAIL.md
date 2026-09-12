# PoC 10 — Urban Detail & Perceptual Realism

## Kết quả

PoC 10 tăng cảm nhận về mật độ và chiều sâu đô thị mà không tạo thêm tuyên bố dữ liệu hiện trạng. Lớp mới dùng vị trí và footprint công trình đã có để sinh chi tiết vi mô một cách tất định:

- 600 thiết bị mái ứng viên thuộc bốn họ: bồn nước, cụm HVAC, lõi kỹ thuật và anten.
- 240 dải hiệu trừu tượng không chứa tên thương hiệu hoặc nội dung nhận dạng.
- 24 khối sương ẩm ở tầng sâu của cảnh.
- Shader khung cửa và dải sàn chìm áp dụng cho 70.719 công trình.
- Thanh mật độ cho phép thay đổi đồng thời số instance và cường độ chiều sâu mặt đứng.

Ở cấu hình mặc định 72%, cảnh hiển thị 432 thiết bị mái và 173 dải hiệu. Người xem có thể đưa mật độ lên 100% để quan sát toàn bộ pool chi tiết.

## Kiến trúc và ngân sách đồ họa

Thiết bị mái được chia thành bốn `InstancedMesh`; dải hiệu dùng bốn atlas style trong bốn `InstancedMesh`; sương dùng một point-cloud shader. Tổng ngân sách mục tiêu của lớp mới là không quá 10 draw calls. Cách này giữ chi phí theo số nhóm vật liệu thay vì theo hàng trăm đối tượng.

Các thiết bị mái được neo vào tâm footprint và cao độ mái hiện có. Dải hiệu được đặt trên cạnh dài nhất của footprint nhà thấp tầng trong vùng trung tâm, xoay theo cạnh và dịch nhẹ ra ngoài mặt đứng. Quy tắc và kết quả được lưu trong `hcmc-poc/data/urban-detail-10.json`.

## Phân loại dữ liệu

Toàn bộ lớp PoC 10 mang nhãn:

`illustrative_procedural_microdetail_not_surveyed_or_observed`

Thiết bị mái, biển hiệu và chi tiết khung cửa không khẳng định loại, kích thước, màu sắc hoặc vị trí thật của từng công trình. Chúng phục vụ kiểm tra giới hạn cảm nhận hình ảnh của pipeline procedural hiện tại.

## Điều kiện chuyển sang dữ liệu quan sát

1. Chỉ thay thiết bị mái thủ tục khi có ảnh xiên được cấp quyền hoặc bản vẽ mái đã kiểm chứng.
2. Chỉ thay dải hiệu trừu tượng bằng nội dung từ ảnh mặt đứng có giấy phép, ngày chụp và provenance.
3. Liên kết mỗi asset mới với building ID, nguồn, thời gian và trạng thái kiểm định.
4. Đo frame time ở cùng camera, viewport và cấu hình trước khi tăng mật độ hoặc độ phân giải.

## Kiểm định

- Manifest sinh tất định và SHA-256: PASS.
- 600 thiết bị mái, 240 dải hiệu, 24 khối sương: PASS.
- Gắn building ID/index cho thiết bị mái và dải hiệu: PASS.
- Không chứa chữ hoặc nhãn hiệu trong dải hiệu: PASS.
- Instancing bắt buộc và ngân sách ≤10 draw calls: PASS.
- JavaScript syntax, bản nhiều tệp, ảnh WebGL và metrics: PASS.

Ảnh kiểm thử: `poc-ten-detail.png`; metrics: `poc-ten-detail.metrics.json`; validator: `hcmc-poc/research/urban-detail-10-validation.json`.
