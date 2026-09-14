"""Create an evidence-bound comparison; do not infer question-level acceptance."""
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
REVIEW = OUT.parent
B04 = ROOT / 'outputs/tayninh-data-batch-04'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

receipts = json.loads((OUT / 'source-fingerprints.json').read_text())
for receipt in receipts:
    assert sha(Path(receipt['path'])) == receipt['sha256'], 'Original source changed'

# Preserve all original questions and source D/K/X labels. Those labels do not
# indicate that the current implementation has passed the question.
rows = list(csv.DictReader((REVIEW / 'question-inventory.csv').open(encoding='utf-8-sig')))
assert len(rows) == 237 and len({r['id'] for r in rows}) == 237
source_questions = {}
for receipt in receipts:
    doc = Path(receipt['path']).name
    for line in (ROOT / receipt['extract']).read_text().splitlines():
        match = re.match(r'(P\d+) \| TABLE \| (\d+) \| (.*?) \| ', line)
        if match:
            key = (doc, match.group(3))
            assert key not in source_questions, key
            source_questions[key] = match.group(1)
assert len(source_questions) == 237
for row in rows:
    row['original_content_block'] = source_questions[(row['document'], row['question'])]
    row['assessment_note'] = 'D/K/X là mức trong tài liệu gốc; chưa phải trạng thái nghiệm thu S07. Xem ma trận năng lực và phạm vi nhóm.'
with (OUT / 'question-inventory-237.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

# R IDs are audit-normalized capabilities, not IDs asserted by the Word files.
# status is deliberately conservative: raw data, modeled output and an
# operational management answer are different levels of accomplishment.
specs = [
('R01','Trải nghiệm lãnh đạo, hỏi rồi có kết quả','Một phần','2D P210–P212; 3D P214',
 'Có bản đồ 3D, chọn lớp, chạm đối tượng xem nguồn, di chuyển, tham quan, giao diện thu gọn.',
 'Chưa có luồng hỏi quản lý → khoanh vùng/chọn tuyến → tính tác động → báo cáo. UI đẹp là một thành phần.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/governance/VERIFY-S07.md'),
('R02','Bao phủ đúng toàn phường và các vùng 3D ưu tiên','Một phần','2D P006, P035; 3D P212–P214',
 'AOI kỹ thuật quanh điểm tham chiếu Gia Lộc; ô chi tiết 250 × 250 m với 52 tâm công trình, 57 footprint giao ô.',
 'Chưa có ranh hành chính chính thức, chưa kiểm kê toàn phường. Theo tài liệu, địa bàn mới gồm cả Phước Đông; không được gọi AOI này là toàn phường.',
 'outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/derived/s07/sample-manifest.json'),
('R03','True orthophoto/orthomosaic khoảng 1 cm và truy cập theo tile','Chưa đạt','2D P009, P018; 3D P008',
 'Ảnh Sentinel-2 30/11/2025, 10 m, crop nguyên gốc 330 × 334 px.',
 'Không phải orthophoto UAV 1 cm. Vật liệu PBR, nội suy và super-resolution không chứng minh chi tiết đo thực. Chưa có dịch vụ tile ảnh khảo sát.',
 'outputs/tayninh-data-batch-04/derived/visual/visual-data.json'),
('R04','Đối tượng có ID, hình học, thuộc tính, nguồn ảnh và thời điểm','Một phần','2D P015; 2D-B-12, 2D-L-10',
 '657 footprint nguồn có ID/hình học, mô hình chiều cao, hồ sơ nguồn; các raster có metadata thời gian/độ phân giải.',
 'Chưa có đầy đủ địa chỉ, hồ sơ quản lý, ảnh chi tiết đúng từng nhà và lịch sử đối tượng qua nhiều kỳ. Ngày phát hành footprint không phải ngày quan sát từng nhà.',
 'outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/derived/solution/solution-data.json'),
('R05','AI bóc tách các lớp bề mặt và kiểm chứng độ chính xác','Một phần','2D P010, P208; 2D-C-14, 2D-E-04',
 'Footprint ML công khai; WorldCover 2021 có lớp cây, cỏ, cây trồng, xây dựng, đất trống, nước và đất ngập; ETH tán cây 10 m.',
 'Chưa có bộ bóc tách ảnh 1 cm cho mặt đường/vỉa hè, cây cá thể, loại cây trồng, công trường, vật cản. Chưa có nhãn thực địa và báo cáo precision/recall hoặc sai số lớp theo dự án.',
 'outputs/tayninh-data-batch-02/derived/surface/surface-aoi-qa.json; outputs/tayninh-data-batch-04/derived/visual/visual-data.json'),
('R06','Khoanh polygon/bán kính, lọc và đếm theo phạm vi tùy chọn','Chưa triển khai','2D P012, P016; 2D-A-04, 2D-A-10',
 'Có số tổng AOI và số công trình trong ô mẫu cố định.',
 'Chưa có công cụ người dùng vẽ vùng, lọc theo thuộc tính rồi đếm từng lớp. 52/657 là số ở các phạm vi cố định, không trả lời mọi vùng lãnh đạo chọn.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/static/solution-ui.js'),
('R07','Đo diện tích, chiều dài và khoảng cách','Một phần','2D P016; 2D-C-02, 2D-B-09',
 'Dữ liệu footprint có diện tích; có tính diện tích/tâm trong bước xử lý và xây dựng hình học.',
 'Chưa có thước đo tương tác, tổng diện tích phần giao vùng và khoảng cách mép đối tượng theo yêu cầu. Số nguồn chưa được QC như đo hiện trường.',
 'outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/static/solution-layer.js'),
('R08','Vùng đệm tuyến, chồng lớp và giao cắt phục vụ quản lý','Chưa triển khai','2D P016; 2D-A-05, 2D-C-10, 2D-G-10',
 'Có thao tác clipping/exclusion nội bộ để dựng đường, nhà, cây hợp lý hơn.',
 'Chưa có buffer 50/100/200 m do người dùng chọn và bảng đối tượng bị ảnh hưởng. Clipping đồ họa không thay thế truy vấn GIS nghiệp vụ.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/static/solution-layer.js'),
('R09','So sánh phương án quy hoạch A/B/C và định lượng tác động','Chưa triển khai','2D-D-05, 2D P211; 3D-A-04, 3D-A-08',
 'A/B hiện tại đổi mô hình cơ bản và chi tiết mô phỏng, giữ cùng camera.',
 'Chưa có phương án tuyến/dự án A/B/C, số nhà/diện tích cây trồng tác động, hoặc khối lượng đào đắp từng phương án. Không dùng A/B đồ họa để tuyên bố đạt A/B/C quy hoạch.',
 'outputs/tayninh-data-batch-04/static/s07-ui.js; outputs/tayninh-data-batch-04/README-S07.md'),
('R10','So sánh nhiều kỳ và truy vết biến động đối tượng','Một phần','2D-L-01–10; 3D-A-07, 3D-L-01–08',
 'Có Sentinel 20/12/2024 và 30/11/2025 cùng lưới 10 m, mask SCL và 5.455 pixel ứng viên khác biệt mạnh; có JRC thay đổi mặt nước dài hạn.',
 'Chưa ghép ID nhà/cây qua kỳ, chưa xác nhận xây mới/tháo dỡ/san lấp, chưa tính thay đổi cao độ/thể tích. Trong B04, lớp change hiển thị ô JRC và thống kê Sentinel; heatmap Sentinel là sản phẩm riêng Batch03.',
 'outputs/tayninh-data-batch-03/derived/temporal/temporal-aoi-qa.json; outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/static/app.js'),
('R11','Tích hợp địa chính, quy hoạch, dự án, tài sản và hồ sơ chuyên ngành','Chưa đạt','2D P011; 2D-B-01–14; 3D P011',
 'Có hồ sơ nguồn dữ liệu công khai và quy ước tọa độ cho AOI kỹ thuật.',
 'Chưa có ranh thửa/loại đất pháp lý, hành lang chính thức, hình học quy hoạch/dự án và quan hệ hồ sơ. Không kết luận quyền sở hữu, vi phạm hoặc bồi thường từ ảnh.',
 'outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/derived/solution/solution-data.json'),
('R12','LiDAR point cloud, DTM/DSM khảo sát, CRS/hệ cao và QC','Chưa đạt','3D P008, P025, P197',
 'Có COPDEM DSM 30 m và GEDTM địa hình dự đoán lớp 30 m; metadata CRS/hệ cao và biến đổi sang cảnh local.',
 'Chưa có point cloud LiDAR, phân loại điểm đất, DTM/DSM khảo sát, hiệu chuẩn và checkpoint độc lập. GEDTM không phải DTM đo LiDAR; chuyển tọa độ bằng code chưa chứng minh chính xác ngoài thực địa.',
 'outputs/tayninh-data-batch-04/derived/solution/solution-data.json; outputs/tayninh-data-batch-04/derived/solution/solution-qa.json'),
('R13','Hình học 3D thực của nhà, cây, đường và hạ tầng','Một phần — còn mô phỏng','3D P009; 3D-B-01, 3D-B-04, 3D-G-01–10',
 'Nhà extrude theo footprint, 482 mô hình Google đủ hỗ trợ chiều cao, phần còn lại proxy; 52 nhà ở ô chi tiết có cửa/mép mái/vật liệu PBR. Cây có thân, nhánh, lá và LOD.',
 '657 chiều cao đo thực vẫn null. 20 mục tiêu mặt đứng, 0 ảnh địa điểm đã xác minh. Mái/cửa/cây là generic mô phỏng; cây hiển thị không phải từng cây quan sát. OSM là tim đường, chiều rộng đường dựng là mô hình; chưa có dây/cột/taluy chi tiết thực.',
 'outputs/tayninh-data-batch-04/derived/solution/solution-data.json; outputs/tayninh-data-batch-04/derived/s07/qa.json; outputs/tayninh-data-batch-04/static/s07-surface.js'),
('R14','Cao độ, độ dốc và mặt cắt theo tuyến bất kỳ','Một phần','3D-C-01, 3D-C-02, 3D-A-06, 3D-E-01',
 'Có cao độ raster, chế độ địa hình, thay nguồn GEDTM/COPDEM và thông tin điểm/lớp.',
 'Chưa có biểu đồ mặt cắt theo tuyến người dùng vẽ, thống kê cấp dốc theo vùng hoặc mặt cắt đường/kênh. Lưới 30 m chưa đủ đo mép đường, rãnh nhỏ hay cao độ nền thiết kế.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/derived/solution/solution-data.json'),
('R15','Thể tích, đào/đắp và khối lượng vật liệu','Chưa triển khai','3D-A-03, 3D-C-04, 3D-C-08, 3D-D-01',
 'Có nền raster/hình khối để phát triển thuật toán sơ bộ.',
 'Chưa có mặt thiết kế, tích phân volume, cut/fill, stockpile và báo cáo sai số. Nhà extrude trông có khối không có nghĩa hệ thống đã có phép đo thể tích nghiệp vụ.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/static/solution-layer.js'),
('R16','Tầm nhìn, khoảng tĩnh không và xung đột 3D','Chưa triển khai','3D-A-01, 3D-B-05, 3D-H-01–08, 3D-E-03',
 'Có raycasting chọn đối tượng và kiểm hình học tránh nhà chìm/xuyên địa hình.',
 'Chưa có LOS/viewshed, khoảng cách 3D theo yêu cầu, sàng lọc cây–dây, xe–cầu hoặc thiết kế–hiện trạng. Kiểm lỗi render không phải clearance hạ tầng.',
 'outputs/tayninh-data-batch-04/static/app.js; outputs/tayninh-data-batch-04/static/solution-layer.js'),
('R17','Bóng đổ theo thời gian/ngày trong năm','Chưa triển khai','3D-B-06',
 'Có ánh sáng/vật liệu phục vụ hiển thị.',
 'Chưa có vị trí mặt trời theo địa điểm/thời gian và phép phân tích vùng bị che theo giờ/mùa. Ánh sáng đẹp chưa đáp ứng nghiên cứu bóng đổ.',
 'outputs/tayninh-data-batch-04/static/app.js'),
('R18','Thoát nước, dòng chảy và mô hình ngập','Chưa đạt','3D-F-01–09; 2D-H-01–09',
 'Có OSM thủy hệ, các ô nước JRC, seasonality và change; địa hình công khai làm nền bối cảnh.',
 'Chưa có mạng cống/kênh đo thực, điều kiện biên/mưa/mực nước, mô hình thủy văn–thủy lực và hiệu chỉnh. JRC occurrence/seasonality không phải độ sâu ngập hoặc mô phỏng dòng chảy.',
 'outputs/tayninh-data-batch-04/derived/fusion/scene-data.json; outputs/tayninh-data-batch-04/static/app.js'),
('R19','CAD/BIM, thiết kế, tiến độ và as-built','Chưa đạt','3D P011; 3D-D-01–10, 3D-L-01–08',
 'Đã có kiểm tra JSON metadata raster, GeoJSON Polygon đơn, GLB mesh subset và hash byte thực.',
 'Importer validation-only, publish=false; chưa giải mã GeoTIFF/LAS và chưa nạp payload vào cảnh. Chưa có CAD/BIM, mặt thiết kế, đối chiếu as-built hay quản lý tiến độ khối lượng.',
 'outputs/tayninh-data-batch-04/static/s07-importer.js; outputs/tayninh-data-batch-04/governance/COMPLETION-S07-IMPORTAUDIT.md'),
('R20','Provenance, quyền sử dụng, chất lượng và kiểm chứng độc lập','Một phần','2D P015, P018, P208; 3D P025, P197',
 'Có source metadata, fingerprint SHA-256, biên nhận tìm nguồn, phân biệt modeled/surveyed, kiểm nodata/geometry/CRS và audit phần mềm.',
 'Hash chứng minh tệp không đổi, không chứng minh ảnh đúng nhà hay tọa độ đúng. Chưa có checkpoint XY/Z, nhãn thực địa, QA độ đầy đủ và biên bản chính xác đo đạc.',
 'outputs/tayninh-data-batch-04/governance/FINAL-FINGERPRINTS-S07.json; outputs/tayninh-data-batch-04/governance/VERIFY-S07.md; outputs/tayninh-data-batch-04/sources/s07/photo-registry.json'),
('R21','Báo cáo tức thời theo vùng/tuyến và phương án','Chưa triển khai','2D-A-09; 2D P203, P211–P212',
 'Có báo cáo QA kỹ thuật và dữ liệu JSON/Markdown đã lưu.',
 'Chưa có báo cáo người dùng tạo từ polygon/tuyến: bảng đối tượng, diện tích giao cắt, bản đồ, nguồn/thời điểm/giới hạn và khác biệt A/B/C. Báo cáo batch cố định chưa đáp ứng câu hỏi phát sinh.',
 'outputs/tayninh-data-batch-04/governance/VERIFY-S07.md; outputs/tayninh-data-batch-04/static/app.js'),
('R22','Tài sản dữ liệu dùng chung và vòng đời đối tượng','Một phần','2D P013, P206; 2D-K-01–08; 3D-K-01–08, 3D P214',
 'Có gói dữ liệu cục bộ, manifests, lớp cảnh và cấu trúc nguồn có thể tái sử dụng giữa batch.',
 'Chưa có vận hành dùng chung nhiều cơ quan, liên kết hồ sơ bảo trì/cập nhật định kỳ và lịch sử đối tượng. Phân ô nội bộ hiện tại chưa phải phát hành OGC 3D Tiles đầy đủ.',
 'outputs/tayninh-data-batch-04/README-S07.md; outputs/tayninh-data-batch-04/static/s07-chunks.js'),
('R23','Chứng minh hiệu quả bằng KPI quản lý','Chưa đo','2D P201–P209; 3D P194–P202',
 'Có kiểm phần mềm, benchmark CPU submission, cache/memory và thao tác desktop/mobile.',
 'Chưa đo phút trả lời câu hỏi, người × ngày, khảo sát tránh được, chi phí/câu hỏi, cơ quan dùng lại, mặt cắt/giờ và độ chính xác checkpoint. Chỉ số render không thay các KPI này.',
 'outputs/tayninh-data-batch-04/governance/VERIFY-S07.md'),
]
fields = ['id','capability','status','original_refs','current_evidence','gap','evidence_files']
matrix = [dict(zip(fields, s)) for s in specs]
with (OUT / 'capability-comparison-23.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(matrix)

group_notes = {
 '2D': [
 'Có thống kê AOI/lớp bối cảnh; chưa khoanh vùng tùy chọn, xếp hạng theo khu phố, buffer và trả lời tức thời.',
 'Chưa tích hợp thửa/hồ sơ pháp lý; có nguồn ảnh theo kỳ nhưng không đủ chứng minh hiện trạng chi tiết từng thửa.',
 'Có footprint/diện tích nguồn và mô hình nhà; chưa kiểm kê toàn phường, mật độ theo khu vực, khoảng lùi, mặt đường thực hoặc biến động từng nhà.',
 'Chưa có tuyến dự án, giao cắt, so sánh A/B/C, kết quả GPMB hoặc hồ sơ bồi thường.',
 'Có WorldCover cây trồng 2021 và ETH tán cây 2020 ở mức raster; chưa ranh vùng sản xuất, cây cá thể, loại cây, sức khỏe/năng suất và kiểm kê theo dự án.',
 'Có JRC/OSM mặt nước bối cảnh và dữ liệu landcover; chưa phân loại rác, nước thải, điểm tập kết hoặc đối chiếu hồ sơ môi trường.',
 'Có tim đường OSM và đường đồ họa; chưa mặt đường/vỉa hè/chiều rộng đo thực, phân tích tiếp cận và buffer mở rộng đường.',
 'Có thủy hệ/địa hình bối cảnh; chưa mạng kênh/cống chi tiết, hành lang pháp lý và truy vấn xung đột. Câu hỏi dòng chảy cần 3D/thủy văn như tài liệu nêu.',
 'Chưa có khu công nghiệp, dự án/quỹ đất và hồ sơ kinh tế được liên kết để trả lời truy vấn đầu tư.',
 'Có cảnh 3D cho quan sát sơ bộ; chưa mạng tiếp cận xe cứu hỏa, tiêu chí rủi ro và dữ liệu PCCC/chuyên ngành.',
 'Chưa có danh mục tài sản công, chủ quản, hồ sơ trường/y tế/dịch vụ và vòng đời.',
 'Có hai kỳ Sentinel và JRC dài hạn ở mức pixel; chưa biến động từng đối tượng, hồ sơ thanh tra, kiểm chứng kết luận và truy vết ảnh chi tiết.'
 ],
 '3D': [
 'Có quan sát/đổi nguồn địa hình; chưa LOS, kịch bản khối mới, cut/fill, mặt cắt và thay đổi thể tích.',
 'Có khối nhà theo footprint/chiều cao modeled và PBR generic; chưa chiều cao đo, mặt đứng đúng nhà, solar shadow study và kiểm soát quy hoạch.',
 'Có COPDEM DSM/GEDTM 30 m; chưa địa hình khảo sát, độ dốc theo vùng, mặt cắt, đào/đắp và stockpile.',
 'Chưa có thiết kế, point cloud nhiều kỳ, khối lượng tiến độ và so sánh as-built.',
 'Có đường render trên terrain; chưa trắc ngang/trắc dọc thực, camber, clearance và mô phỏng đường đi xe theo kích thước.',
 'Có địa hình/thủy hệ/JRC bối cảnh; chưa mô hình thoát nước/ngập đã hiệu chỉnh. LiDAR thường không đo đáy dưới nước như tài liệu giới hạn.',
 'Có ETH chiều cao tán cây raster và cây mô phỏng; chưa phân đoạn từng cây/chiều cao kiểm chứng, cấu trúc tán quan sát và liên kết vùng canh tác.',
 'Chưa cột/dây/utility và phép sàng lọc khoảng tĩnh không/tầm nhìn; chưa hồ sơ hạ tầng ngầm.',
 'Có bối cảnh cây/nước/terrain; chưa đo stockpile, đào đắp, xói mòn và thay đổi thể tích.',
 'Chưa dữ liệu KCN/PCCC, lối xe chữa cháy, chướng ngại, tiêu chí ứng cứu và mô phỏng nghiệp vụ.',
 'Chưa danh mục tài sản có hồ sơ bảo trì, hình học chi tiết và lịch sử vận hành.',
 'Có so sánh ảnh quang học mức pixel; chưa point cloud/mặt địa hình nhiều kỳ, biến dạng và đối chiếu as-built. Không hứa đo lún mm từ nguồn hiện có.'
 ]
}
group_rows = []
for doc in ('2D','3D'):
    for index, letter in enumerate('ABCDEFGHIJKL'):
        selected = [r for r in rows if r['id'].startswith(f'{doc}-{letter}-')]
        group_rows.append({'document':doc, 'group':selected[0]['group'], 'questions':len(selected),
                           'question_id_range':f"{selected[0]['id']} → {selected[-1]['id']}",
                           'coverage_note':group_notes[doc][index]})
assert sum(g['questions'] for g in group_rows) == 237
with (OUT / 'sector-coverage-24.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer = csv.DictWriter(f,fieldnames=list(group_rows[0]))
    writer.writeheader()
    writer.writerows(group_rows)

evidence_names = sorted({name.strip() for row in matrix for name in row['evidence_files'].split(';')})
for name in evidence_names:
    assert (ROOT / name).is_file(), name
audit = {
 'date':'2026-09-14', 'scope':'Gia Lộc Batch04/S07; đối chiếu tài liệu định hướng 2D và 3D/LiDAR',
 'original_sources':receipts,
 'original_question_counts':dict(Counter(r['id'].split('-')[0] for r in rows)),
 'original_levels':{doc:dict(Counter(r['source_level'] for r in rows if r['id'].startswith(doc+'-'))) for doc in ('2D','3D')},
 'normalized_capabilities':matrix, 'sector_coverage':group_rows,
 'evidence_fingerprints':[{'path':name,'sha256':sha(ROOT / name)} for name in evidence_names],
 'limitations':[
  'Không là nghiệm thu đo đạc ngoài thực địa; chưa có checkpoint hoặc nhãn kiểm chứng.',
  'Không tạo tỷ lệ hoàn thành từ 237 câu hỏi; các câu hỏi chồng lấn, có điều kiện và có giới hạn.',
  'R01–R23 là nhóm năng lực do lượt đối chiếu tổng hợp, không phải số mục gốc trong Word.',
  'D/K/X là mức nguồn gốc, không phải PASS/FAIL của S07; X bao gồm bài toán sàng lọc/ước tính, không đồng nghĩa bất khả thi.',
  'Các URL pháp lý/quy hoạch trong tài liệu chưa được xác minh lại nội dung/hiệu lực ở lượt đối chiếu này.'
 ]
}
(OUT / 'comparison-evidence.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')

def link(name, label=None):
    return f'[{label or Path(name).name}]({ROOT / name})'

def extract_link(doc, block):
    stem = 'Digital_Twin_2D_Phuong_Gia_Loc_Tay_Ninh_GSD_1cm' if doc=='2D' else 'Digital_Twin_3D_LiDAR_Phuong_Gia_Loc_Tay_Ninh'
    return f'[{doc} {block}]({OUT / (stem+".txt")}:{int(block[1:])})'

parts = [
 '# Đối chiếu Gia Lộc S07 với hai tài liệu Digital Twin gốc\n',
 'Ngày đối chiếu: **14/09/2026**. Đối tượng kiểm: gói Gia Lộc Batch04 đang tích hợp S07, không phải chỉ ô ảnh demo và không phải City Lab TP.HCM. Đọc lại cả hai DOCX gốc; hash khớp hồ sơ đã lưu. Không sửa code sản phẩm trong lượt này.\n',
 '**Kết luận:** hệ thống hiện là PoC bản đồ 3D có dữ liệu công khai, lớp bối cảnh phân tích và nền kiến trúc có kiểm chứng phần mềm. Chưa đạt Digital Twin quản lý theo hai tài liệu: còn thiếu truy vấn vùng/tuyến tùy chọn, tác động phương án, đo 3D nghiệp vụ, dữ liệu khảo sát chi tiết và tích hợp hồ sơ. Những phần này cần được theo dõi riêng với tiến độ polish đồ họa.\n',
 '## 1. Hai tài liệu thực sự yêu cầu gì?\n',
 'Tài liệu 2D có **125 câu hỏi/12 nhóm**; tài liệu 3D/LiDAR có **112 câu hỏi/12 nhóm**. Tổng 237 là ngân hàng tình huống quản lý, không phải 237 tiêu chí nghiệm thu độc lập. Cả hai tự xác định là tài liệu định hướng ứng dụng. Các yêu cầu dưới đây là năng lực tổng hợp để đối chiếu, không bổ sung thành yêu cầu tác giả đã viết.\n',
 f'- **2D:** biến toàn phường thành dữ liệu không gian có thể hỏi; nền true orthophoto khoảng 1 cm, đối tượng AI có ID/hình học/thuộc tính/nguồn/thời điểm; lọc, đếm, đo, buffer, giao cắt và so sánh thời gian. {extract_link("2D","P006")}, {extract_link("2D","P009")}, {extract_link("2D","P016")}.\n',
 f'- **3D/LiDAR:** kế thừa 2D; point cloud + DTM/DSM + mesh/orthophoto có hệ tọa độ và QC; đo cao độ, độ dốc, mặt cắt, thể tích, đào/đắp, tầm nhìn, tĩnh không, biến động mặt và kịch bản. {extract_link("3D","P006")}, {extract_link("3D","P008")}, {extract_link("3D","P010")}.\n',
 f'- **Triển khai hai tầng:** nền 2D toàn phường; 3D/LiDAR ưu tiên khu công nghiệp, trục đường, dự án/GPMB, kênh–thoát nước, vùng rủi ro và hành lang hạ tầng. Đây là định hướng trong tài liệu, chưa chứng minh các vùng đó đã nằm trong AOI đang có. {extract_link("3D","P213")}.\n',
 '- Mức **D**: trả lời trực tiếp khi có dữ liệu Digital Twin phù hợp; **K**: phải kết hợp hồ sơ quản lý; **X**: sàng lọc/ước tính, cần xác minh. Không mức nào tự xác nhận hiện tại đã làm được.\n',
 '**Chưa phải hồ sơ nghiệm thu hoàn chỉnh:** hai file chưa chốt sai số XY/Z cho từng sản phẩm, mật độ điểm, ngưỡng đầy đủ/AI, chu kỳ cập nhật, quy cách bàn giao và giá trị KPI cần đạt. Phải thống nhất thêm các thông số này trước cam kết nghiệm thu. GSD 1 cm không đồng nghĩa chính xác tọa độ 1 cm; có LiDAR không tự động đạt survey-grade — chính hai tài liệu nêu giới hạn này.\n',
 '## 2. Nền hiện có và giới hạn quan sát\n',
 '- **Phạm vi:** AOI kỹ thuật, `official_boundary=false`; ô chi tiết 250 × 250 m, 52 công trình theo tâm/57 footprint giao ô. Không phải toàn phường và không phải ranh pháp lý.\n',
 '- **Nhà:** 657 footprint nguồn, trong miền terrain dựng 656; 1 ngoài miền pixel-center được khai báo. 482 mô hình Google đủ hỗ trợ chiều cao; nguồn vẫn 657/657 chiều cao đo thực null. Chi tiết cửa, mái, khung và PBR giúp nhìn rõ hơn nhưng là mô phỏng.\n',
 '- **Ảnh:** Sentinel 30/11/2025, 10 m, 330 × 334 px. Registry mặt đứng có 20 mục tiêu, **0 ảnh địa điểm đã xác minh**. Bốn vật liệu PBR CC0 đang dùng là ảnh bề mặt generic, không phải ảnh những nhà Gia Lộc.\n',
 '- **Địa hình:** COPDEM DSM 30 m và GEDTM địa hình dự đoán lớp 30 m, không có LiDAR/DTM khảo sát. Đổi nguồn/phóng đứng là thao tác hiển thị, không xác nhận đo cao độ đạt chuẩn.\n',
 '- **Cây/đất/nước:** có ETH chiều cao tán cây raster 10 m, WorldCover 2021 và JRC/OSM thủy hệ. Cây đồ họa không phải vị trí/ID từng cây thực; đường đồ họa không phải bản đo bề rộng mặt đường.\n',
 '- **Nhiều kỳ:** đã có hai Sentinel 20/12/2024 ↔ 30/11/2025 và 5.455 pixel ứng viên khác biệt mạnh, mask theo SCL; có JRC dài hạn. Đây là khác biệt quang phổ/mặt nước ở mức raster, chưa phát hiện từng công trình hoặc biến động thể tích.\n',
 '- **Kiến trúc:** nguồn/provenance, kiểm metadata/CRS/nodata, LOD, phân ô theo camera, Worker và cache; bộ kiểm tệp thực nhưng validation-only. Chưa có đường nạp/xử lý/phát hành dữ liệu khảo sát hoàn chỉnh.\n',
 '## 3. Ma trận năng lực\n',
 '“Một phần” nghĩa có thành phần/dữ liệu, chưa hoàn thành đầu ra nghiệp vụ. “Chưa triển khai” nghĩa chưa có công cụ đó trong ứng dụng hiện hành; không khẳng định công cụ không thể xây trên dữ liệu công khai. “Chưa đạt” nhấn mạnh sản phẩm/độ chính xác hoặc dữ liệu còn thiếu.\n',
 '| ID | Năng lực và mốc tài liệu | Hiện trạng | Khoảng cách cần khép |\n|---|---|---|---|\n'
]
for row in matrix:
    parts.append(f"| {row['id']} | **{row['capability']}**<br>{row['original_refs']} | **{row['status']}**<br>{row['current_evidence']} | {row['gap']} |\n")
parts += [
 '\nMỗi dòng có đường dẫn tệp chứng cứ trong [ma trận CSV](capability-comparison-23.csv); fingerprint của các tệp nằm trong [comparison-evidence.json](comparison-evidence.json). R01–R23 là mã đối chiếu tự tổng hợp. Pxxx là khối nội dung trong bản trích Word, **không phải số trang**.\n',
 '## 4. Những câu hỏi phải thử trực tiếp để chứng minh đúng bài toán\n',
 '| Câu hỏi gốc | Hệ thống hiện tại trả lời tới đâu? | Điều kiện để nâng mức đáp ứng |\n|---|---|---|\n',
 '| **2D-A-04 / A-09:** lãnh đạo vẽ một vùng, hỏi số công trình/diện tích cây trồng rồi xuất báo cáo | Chưa làm được thao tác tùy vùng. Có số tổng và ô cố định. | Vẽ polygon, truy vấn giao cắt từng lớp, tính diện tích phần giao, báo cáo nguồn/kỳ/độ phân giải. |\n',
 '| **2D-G-10 / D-05:** mở rộng đường X m mỗi bên, đổi A/B/C, bao nhiêu nhà/đất bị ảnh hưởng? | Chưa có nghiệp vụ này. A/B hiện tại chỉ đổi độ chi tiết render. | Tuyến đầu vào, buffer theo đơn vị mét, bảng ID/diện tích ảnh hưởng và so sánh; nhãn “thử phương án” nếu chưa có hồ sơ phê duyệt. |\n',
 '| **3D-B-01:** chiều cao thực của từng nhà? | Có chiều cao modeled/proxy; chưa có chiều cao đo. | Hình học/point cloud quan sát, hệ cao/scale được kiểm, mẫu thực địa và sai số. |\n',
 '| **3D-A-06 / C-04:** mặt cắt bất kỳ, khối lượng đào/đắp với mặt thiết kế? | Chưa có công cụ mặt cắt và cut/fill. | Có thể xây thuật toán/raster profile sơ bộ ngay; kết quả 30 m chỉ là bối cảnh, cần DTM khảo sát cho thiết kế/khối lượng tin cậy. |\n',
 '| **2D-L-01 / 3D-A-07:** nhà mới hay san lấp đổi bao nhiêu giữa hai kỳ? | Có ứng viên khác biệt ảnh; chưa nhà mới, chưa chênh cao/volume. | Dữ liệu nhiều kỳ đồng đăng ký, phân loại/ghép ID, xác minh mẫu; bề mặt 3D tương thích cho chênh thể tích. |\n',
 '## 5. Thứ tự tiếp theo bám tài liệu, không chờ drone\n',
 '1. **Xây luồng truy vấn quản lý trên dữ liệu hiện có:** vẽ vùng/tuyến → lọc/đếm → diện tích, khoảng cách → buffer/giao cắt → bảng đối tượng và xuất báo cáo. Tính theo hình học gốc ở hệ mét, không lấy vị trí đã phóng đứng hay tọa độ màn hình. Nêu rõ đây là kết quả sơ bộ theo nguồn công khai.\n',
 '2. **Đưa A/B/C phương án vào demo:** tuyến và phạm vi có nguồn hoặc do người dùng nhập để thử; cùng camera, cùng dữ liệu, thay phương án để so tác động. Không tự đặt phương án là quy hoạch chính thức hay “tầm nhìn 100 năm” đã được duyệt.\n',
 '3. **Hoàn thiện phép phân tích 3D và lộ trình dữ liệu:** slope/profile/volume/cut–fill/LOS dùng fixture có lời giải để kiểm thuật toán; hiển thị tính toán sơ bộ 30 m khi phù hợp, chặn mục cần độ chính xác vượt nguồn. Mở đường nạp raster/vector/point cloud/mesh thật, QC rồi phiên bản hóa trước phát hành; importer hiện mới kiểm tệp.\n',
 '4. **Khép dữ liệu và hồ sơ:** tìm/mua/đề nghị chia sẻ theo quyền sử dụng ảnh dưới mét đúng vùng, point cloud/DTM/DSM, mặt đứng có GPS/ngày/quyền; ưu tiên ranh hành chính, địa chính/quy hoạch và hình học dự án chính thức. Giữ nguồn không đạt ở bối cảnh, không nâng cấp nhãn thành khảo sát. Dữ liệu payload RtR bổ sung sau theo cùng quy trình QC.\n',
 '5. **Đo pilot nghiệp vụ:** cùng câu hỏi/cùng phạm vi, ghi thời gian trả lời, người × ngày, số lần khảo sát, cơ quan tái sử dụng, chi phí và sai số kiểm chứng. Bổ sung điều kiện nghiệm thu định lượng với đơn vị quản lý.\n',
 'Các lớp học máy công khai, engine 3D và nguồn mở giúp làm trước logic, demo và khung vận hành. Chúng không tự tạo ra bằng chứng đo centimet, mặt đứng thực hay hồ sơ pháp lý còn thiếu.\n',
 '## 6. Phạm vi không được hứa tự trả lời\n',
 'Hai file đã nêu giới hạn: chủ đất/bồi thường/cấp nhà pháp lý cần hồ sơ; chất ô nhiễm cần sensor/lấy mẫu; đáy dưới nước cần thủy đạc chuyên dụng; hạ tầng ngầm cần hồ sơ/GPR/khảo sát; an toàn kết cấu/PCCC cần kiểm định; bệnh/năng suất cây cần mô hình và ground truth phù hợp. Các dòng X là sàng lọc/ước tính có điều kiện, không đồng nghĩa tất cả đều bất khả thi. Chưa có cơ sở hứa đo lún mm từ UAV LiDAR hoặc dữ liệu 30 m đang dùng.\n',
 '## 7. Hồ sơ đối chiếu và giới hạn lượt kiểm\n',
 '- [Danh mục đủ 237 câu hỏi](question-inventory-237.csv): giữ nguyên nội dung, đơn vị sử dụng, lợi ích và mức D/K/X, thêm khối nội dung gốc đã đối chiếu một-một.\n',
 '- [Phạm vi 24 nhóm lĩnh vực](sector-coverage-24.csv): đủ 12 nhóm 2D và 12 nhóm 3D, ghi phần có/chưa có; không chấm PASS cả nhóm chỉ vì có một lớp raster.\n',
 '- [Ma trận 23 năng lực](capability-comparison-23.csv) và [chứng cứ/fingerprint](comparison-evidence.json).\n',
 f'- DOCX gốc: [2D]({receipts[1]["path"]}), [3D/LiDAR]({receipts[0]["path"]}); [biên nhận đọc lại](source-fingerprints.json).\n',
 f'- Nguồn trạng thái S07: {link("outputs/tayninh-data-batch-04/README-S07.md")}, {link("outputs/tayninh-data-batch-04/governance/VERIFY-S07.md")}. **14/14 của S07 chỉ là nghiệm thu phần mềm trong batch; không phải 100% hai tài liệu gốc.**\n',
 '- Lượt kiểm này đọc tài liệu và đối chiếu artifact/code của ứng dụng, kế thừa kiểm browser đã ghi trong Verify S07; không thực hiện đo ngoài hiện trường hoặc tái kiểm hiệu lực các văn bản pháp lý/URL được tài liệu dẫn. Những thông tin hành chính/quy hoạch được nhắc ở đây là nội dung tài liệu, chưa là lớp dữ liệu pháp lý được nhập vào hệ thống.\n',
 '- Không tính “% hoàn thành Digital Twin”: câu hỏi chồng lấn, có điều kiện, thiếu tiêu chí nghiệm thu và nhiều đầu ra còn mô phỏng.\n',
 '- Với TP.HCM, có thể tái sử dụng kiến trúc engine/provenance và các phép truy vấn khi xây xong; dữ liệu Gia Lộc không thay thế dữ liệu TP.HCM. Báo cáo cũ [Gia Lộc và City Lab](../DOI-CHIEU-GIA-LOC-VA-CITY-LAB.md) là mốc PoC16d trước các batch Gia Lộc, không dùng để phủ nhận dữ liệu nhiều kỳ đã có ở Gia Lộc hôm nay.\n'
]
formatted = ''
for part in parts:
    is_list = bool(re.match(r'(?:- |\d+\. )', part))
    is_table = part.startswith('|')
    if not is_table and formatted and not formatted.endswith('\n\n'):
        # Adjacent list items stay together; prose and headings get a blank line.
        prior_line = formatted.rstrip('\n').split('\n')[-1]
        prior_list = bool(re.match(r'(?:- |\d+\. )', prior_line))
        if not (is_list and prior_list):
            formatted += '\n'
    formatted += part.rstrip('\n') + ('\n' if is_list or is_table else '\n\n')
(OUT / 'DOI-CHIEU-GIA-LOC-S07.md').write_text(formatted)
print(json.dumps({'original_questions':len(rows),'capabilities':len(matrix),'sector_groups':len(group_rows),'evidence_files':len(evidence_names),'report':str(OUT/'DOI-CHIEU-GIA-LOC-S07.md')},ensure_ascii=False))
