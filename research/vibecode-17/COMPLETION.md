# Completion — Digital Twin Core 17

Trạng thái: **COMPLETE cho 16 yêu cầu R17; READY cho demo và phát triển tiếp.** Chủ thầu: root; ba Thợ: twin_sources, twin_gis, leadership_ui. [VERIFY.md](VERIFY.md) ghi kết quả nghiệm thu và giới hạn.

Đã xây lõi nguồn, adapter tọa độ, QC, schema nội bộ và cấu hình TP.HCM/Gia Lộc; GIS geometry/index/Worker/client; plugin Phân tích trên City Lab đang dùng. Khoanh vùng và hành lang A/B/C có clipping, union và source identity theo hợp đồng, highlight 3D và báo cáo JSON/CSV/HTML có bằng chứng. Worker kiểm SHA-256 byte JSON trước parse; nguồn thiếu quyền hoặc chất lượng phù hợp bị chặn theo năng lực.

Kiểm chứng: 76/76 core tests; 14/14 UI và 18/18 hồi quy trình duyệt; 6/6 scenario oracle độc lập; 7/7 kiểm tra chức năng/thị giác của Chủ thầu; 3/3 catalog CHECK; 9/9 kiểm cú pháp và 26 file fingerprints. Các nhóm kiểm giữ riêng, không cộng thành số chức năng hay độ chính xác khảo sát. Scene TP.HCM vẫn khớp SHA-256 gốc. Không sửa dữ liệu nguồn, commit, push hoặc publish.

TP.HCM dùng 70.709 biểu diễn building và loại 10 khối minh họa khỏi inventory GIS; 70.701 ID nguồn chưa phải số nhà/thửa kiểm chứng. Gia Lộc chuẩn hóa 657 footprint trong artifact QC chưa publish; UI Gia Lộc chưa migration. Dữ liệu mô hình, ảnh procedural và đầu mối quy hoạch giữ đúng phân loại.

[Nghiên cứu và kiến trúc](ARCHITECTURE-AND-SOURCES.md) trích nguồn sơ cấp và phân rõ đã xây/chưa xây. Đợt này vận hành vector, chưa thêm dữ liệu đo kiểm hoặc decoder COG/COPC/3D Tiles/BIM/SfM/3DGS. Hình ảnh legacy không được nhận tăng độ nét hoặc độ chính xác chỉ nhờ viết contract. Phase tiếp theo ưu tiên nguồn chính thức, streaming raster và đăng ký terrain; sau đó LOD, ID ngữ nghĩa, cận cảnh từ capture thật và sa bàn quy hoạch đúng phiên bản.

[Hướng dẫn demo](../../outputs/DEMO-17-HUONG-DAN.md): mở http://127.0.0.1:8768/hcmc-poc/?v=17b&view=overview, chọn Phân tích → Mẫu hành lang Nguyễn Huệ. UI asset cache 17b; semantic catalog 17a. Bản HTTP cần hai thư mục HCMC và shared cạnh nhau; gói HTML độc lập cũ chưa chứa plugin 17. Chi tiết từng Thợ trong COMPLETION-SOURCES.md, COMPLETION-GIS.md và COMPLETION-UI.md.
