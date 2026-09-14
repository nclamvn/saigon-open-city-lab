# Batch 01 — Gia Lộc / Tây Ninh data foundation

Contractor: /root. User explicitly authorizes Vibecode Contractor/Builder implementation, prioritizing maximum accessible external data before future Hera payload capture. This batch establishes real acquired datasets, provenance and reusable intake; does not claim completion of all237questions or wholewardcoverage.

Scope: Gia Lộc/Tây Ninh first, reusable for HCMC. Preserve existing CityLab application. No flight planning/operations, invented measured data or unverified legal boundary. If official machine-readable ward boundary unavailable, use a clearly labeled source-located pilot AOI, never title it fullwardcoverage.

R01: verify location and administrative scope with official source; retain null official geometry if not acquired.
R02: acquire actual geographic data from accessible authorized sources for that AOI, with raw snapshots and hashes. Discovery link != downloaded data. Unknown license/accuracy stays null, not promoted.
R03: record per-source publisher, URL, capture/data dates, spatial resolution, CRS/vertical datum, license/access, coverage, evidence, limitations; map to requirements/use cases.
R04: reusable intake/validation and an inspectable data workbench listing acquired/candidate/blocked/missing status, no false readiness.
R05: artifact verification of provenance, geometry bounds/counts, file integrity and failure tests; quantify actual acquired sources and unlocked/blocked use cases.

Roles: planning_sources owns official location/AOI + local/vector acquisition; geometry_audit owns global raster/LiDAR discovery and one suitable sample acquisition; leadership_ui builds intake/registry validation/workbench independently. Contractor integrates evidence and validates output. Each Builder must save TIP before mutation and Completion Report. No architecture migration or mainapp edits.

Gate decision: no additional user approval needed for read-only public research, authorized dataset downloads and reversible local implementation explicitly requested. External messages, purchases or acceptance of new terms not authorized. Keep batch manageable; large providers/catalogs can be indexed while representative geographically relevant samples are acquired. Logs distinguish failed acquisition from evidence of nonexistence.

## RRI tự trả lời từ hồ sơ hiện có

- End user: lãnh đạo cần bắt đầu từ câu hỏi quản lý và nhìn thấy nguồn, phạm vi, chất lượng của câu trả lời.
- Business: Gia Lộc là địa bàn đầu tiên; kiến trúc dữ liệu phải chuyển được sang TP.HCM và tiếp nhận dữ liệu Hera về sau.
- QA: dữ liệu tải được phải kiểm hash, phạm vi, cấu trúc và giấy phép; một URL hoặc ảnh minh họa không được tính là lớp dữ liệu sẵn sàng.
- Developer: Batch 01 đứng độc lập, không làm bẩn City Lab đang demo; dữ liệu có schema và script kiểm tất định.
- Operator: không cần khóa API cho bản bàn giao; nguồn cần tài khoản được ghi candidate/blocked, không giả vờ đã tải.

Open questions được giữ thành dữ liệu thiếu: ranh chính thức dạng máy đọc của phường mới; hệ tọa độ và hệ cao độ mục tiêu; quyền dùng lại lớp chuyên ngành tỉnh; AOI pilot cuối cùng do đơn vị nghiệp vụ chốt. Các câu này không ngăn việc dựng registry và tải mẫu công khai theo AOI có nguồn.

## Task graph

1. LOCAL: định vị và lưu bằng chứng hành chính; dựng pilot AOI; tải vector công khai; lập danh sách lớp tỉnh có thể tiếp cận.
2. GLOBAL: từ AOI đã có, tải mẫu raster địa hình/ảnh/lớp phủ và xác minh catalog LiDAR/point cloud.
3. WORKBENCH: hợp nhất receipt, chạy cổng chất lượng, ánh xạ yêu cầu và tạo giao diện kiểm kê.
4. VERIFY: Contractor đối chiếu độc lập raw ↔ receipt ↔ registry ↔ UI; ghi rõ mức sẵn sàng và backlog.

LOCAL và WORKBENCH có thể chạy song song; GLOBAL phụ thuộc AOI; VERIFY phụ thuộc cả ba Completion Report.
