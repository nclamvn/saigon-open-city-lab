import pathlib,json,csv
r=pathlib.Path(__file__).resolve().parents[1];rows=[
('OpenStreetMap','https://www.openstreetmap.org/copyright','ODbL','Đường, mặt bằng nhà, sông và công viên. Đã tải snapshot; cần attribution và tuân thủ ODbL.','Đã tích hợp'),
('Overpass API','https://dev.overpass-api.de/overpass-doc/en/preface/commons.html','Dịch vụ cộng đồng','Truy vấn theo vùng nhỏ; đã dùng endpoint Kumi sau khi endpoint chính timeout. Không dùng làm backend sản xuất phụ thuộc lâu dài.','Đã thử API'),
('Geofabrik Vietnam','https://download.geofabrik.de/asia/vietnam.html','OSM / ODbL','Gói dữ liệu Việt Nam để mở rộng phạm vi, tải theo đợt thay vì cào tile. Chưa tải toàn bộ PBF.','Có gói tải'),
('Overture Buildings','https://docs.overturemaps.org/guides/buildings/','Theo nguồn: CDLA / ODbL','Đã tải 70.699 đối tượng bản 2026-08-19.0; bổ sung 60.392 khối sau lọc chồng lấn và diện tích nhỏ. 170 đối tượng tải về có height; phần lớn vẫn thiếu chiều cao.','Đã tích hợp'),
('Microsoft Buildings','https://github.com/microsoft/GlobalMLBuildingFootprints','CDLA Permissive 2.0','Footprint do ML phát hiện. Một số đối tượng OSM trong PoC ghi nguồn Microsoft; chưa tải và hợp nhất bộ Microsoft riêng.','Nguồn bổ sung'),
('Google Open Buildings 2.5D','https://sites.research.google/gr/open-buildings/temporal/','CC BY 4.0 hoặc ODbL','Có Việt Nam. Dữ liệu chiều cao dự đoán 2016–2023; trần 100 m, độ phân giải hiệu dụng khoảng 4 m. Có lối tải GCS; chưa tải raster cho PoC.','Ưu tiên kế tiếp'),
('Copernicus Data Space','https://dataspace.copernicus.eu/about','Dữ liệu mở; quota dịch vụ','Ảnh Sentinel mới để kiểm tra thay đổi. Miễn phí trong quota; không đủ để chụp rõ mặt đứng. Tài khoản có thể cần tùy cách tải.','Đã đọc điều kiện'),
('Mapzen Terrain Tiles','https://registry.opendata.aws/terrain-tiles/','Giấy phép theo nguồn DEM','Đã tải một tile Terrarium mẫu. Chưa ghép đủ vùng hay đưa vào cảnh; mô hình hiện dùng nền phẳng.','Đã tải mẫu'),
('EOX Sentinel-2 2016','https://cloudless.eox.at/license-non-commercial','CC BY 4.0','Đã tải ảnh nền vùng PoC qua WMS. Mosaic 2016/2017, được sử dụng kèm attribution; chỉ là bối cảnh lịch sử.','Đã tích hợp'),
('EOX 2018–2025','https://cloudless.eox.at/license-non-commercial','CC BY-NC-SA 4.0','Miễn phí phi thương mại. Không chọn làm nền cho PoC doanh nghiệp; cần điều kiện thương mại phù hợp nếu dùng.','Loại khỏi bản này'),
('OpenAerialMap','https://docs.openaerialmap.org/api/api/','Kiểm tra từng ảnh; API CC BY 4.0','Truy vấn bbox PoC trả 0 kết quả. Chỉ kết luận cho bbox và thời điểm đã truy vấn; không suy rộng toàn thành phố.','Đã thử: 0 ảnh'),
('GITC / HCMGIS','https://hcmgis.vn/','Chưa xác nhận quyền tải','Đầu mối GIS và đám mây điểm địa phương. Chưa có bộ dữ liệu tải được; thu thập trực tiếp gặp lỗi chứng chỉ.','Cần làm việc với chủ nguồn'),
('HCMC Geoportal','https://geoportal-stnmt.tphcm.gov.vn/','Chưa xác nhận','Có cổng công khai, nhưng bản HTML trả về không đủ để xác nhận dữ liệu 3D được tải tự do.','Chưa xác nhận dữ liệu'),
('OpenDroneMap','https://docs.opendronemap.org/faq/','AGPLv3','Xử lý ảnh UAV thành mesh, orthophoto, point cloud. Miễn phí phần mềm không đồng nghĩa miễn phí phần cứng và khảo sát.','Đã kiểm tra phương pháp'),
('WebODM / ODX','https://webodm.org/','Mã nguồn mở; xem repo từng thành phần','Lựa chọn xử lý ảnh tại máy. Website hiện công bố hoạt động riêng với engine ODX; không dùng hướng dẫn cũ về giá installer để kết luận.','Đã kiểm tra hiện trạng'),
('COLMAP','https://colmap.github.io/','BSD; xem thành phần phụ thuộc','Tính vị trí camera và dựng hình từ bộ ảnh có chồng phủ. Chưa chạy do chưa có bộ ảnh đa góc phù hợp vùng PoC.','Sẵn sàng phương pháp'),
('gsplat','https://github.com/nerfstudio-project/gsplat','Apache 2.0','Dựng biểu diễn Gaussian từ ảnh và pose; cần compute phù hợp. Không tự tạo dữ liệu thật cho TP.HCM.','Nhánh cận cảnh'),
('Three.js','https://github.com/mrdoob/three.js','MIT','Engine hiển thị PoC; đã lưu thư viện cùng sản phẩm để không phụ thuộc CDN khi mở lại.','Đã tích hợp'),
('Cesium / 3D Tiles','https://cesium.com/learn/3d-tiling/','Tách engine mở và dịch vụ ion','Hướng mở rộng dữ liệu phân mảnh và địa tham chiếu. Dịch vụ hosted/tiler có điều kiện riêng; PoC này không sử dụng ion.','Kiến trúc mở rộng'),
('Google Map Tiles','https://developers.google.com/maps/documentation/tile/policies','API có điều kiện / không phải dữ liệu mở','Không tải lại mesh hay ảnh Google làm bộ dữ liệu tự do. Chưa xác nhận phủ photorealistic TP.HCM. Không dùng trong PoC.','Không đưa vào nhánh free'),
('Dlubal Bitexco model','https://www.dlubal.com/en/downloads-and-information/examples-and-tutorials/models-to-download/002404','Cho dự án/đào tạo; kiểm tra phân phối lại','Phát hiện trang mô hình mô phỏng gió Bitexco tải được theo nhà cung cấp. Chưa tải model hoặc xác nhận quyền nhúng/phân phối lại.','Đầu mối asset chi tiết')
]
objs=[dict(zip(['name','url','license','use','status'],x)) for x in rows]
(r/'data/catalog.js').write_text('window.SOURCE_CATALOG='+json.dumps(objs,ensure_ascii=False)+';')
(r/'research/source-catalog.json').write_text(json.dumps(objs,ensure_ascii=False,indent=2))
with (r/'research/source-catalog.csv').open('w',encoding='utf-8-sig',newline='')as f:
 w=csv.DictWriter(f,fieldnames=objs[0].keys());w.writeheader();w.writerows(objs)
