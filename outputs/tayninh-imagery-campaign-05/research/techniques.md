# C05 — Kỹ thuật làm cảnh Gia Lộc rõ và đẹp hơn

Ngày rà: 14/09/2026. Phạm vi là nghiên cứu và kiểm source chỉ đọc; chưa thay renderer Batch 04. Các phương án dưới đây phân biệt **ảnh quan sát**, **hình học tái dựng**, **tham số suy đoán** và **vật liệu mô phỏng**. Kích thước file xuất, cảm giác sắc nét và độ chính xác đo đạc là ba đại lượng khác nhau.

## Kết luận để triển khai trước dữ liệu Hera

Vẫn có thể nâng chất lượng thị giác bằng dữ liệu hiện có: giữ texture native, kiểm UV/LOD, giảm phóng đứng DSM, sửa cách đặt nền công trình, rồi thêm mái và vật liệu PBR mô phỏng trên footprint. Không phương pháp nào trong danh sách tạo được mặt đứng quan sát của từng nhà từ một ảnh Sentinel 10 m. Hướng tạo chi tiết thực là thu ảnh gần hoặc ảnh hàng không có đủ góc chụp, định hướng và điểm kiểm; khi có dữ liệu này mới chọn mesh SfM/MVS hoặc một cảnh 3D Gaussian Splatting cục bộ.

Khuyến nghị có hai chế độ rõ ràng: **nền dữ liệu** dùng nguồn, ngày, GSD và thuộc tính còn thiếu; **trình diễn vật liệu** thêm mái, tường và cây mô phỏng với nhãn luôn thấy. Cả hai dùng cùng footprint ID, nhưng trường `height_observed`, `roof_observed`, `material_observed` giữ null khi chưa có chứng cứ. Không gắn ngày Sentinel cho texture được sinh bằng code.

## Chẩn đoán Batch 04 hiện hành

Bằng chứng số, hash và đoạn code được giữ trong [batch04-source-audit.json](../evidence/techniques/batch04-source-audit.json); baseline độc lập của Contractor ở [house-image-sampling.json](../evidence/baseline/house-image-sampling.json).

| Vấn đề | Source hiện tại | Ý nghĩa và việc cần làm |
|---|---|---|
| Nhà mờ | PNG Sentinel ngày 30/11/2025 là **330×334, 10 m**, bytes trùng nguồn. Native path và UV từ CRS nguồn đã tồn tại; 109×109 RGB chỉ còn fallback. | Không báo lại lỗi downsample như hiện trạng chính. Gate việc load native, thông báo fallback, kiểm screenshot và probe ở cả hai đường. |
| Không đủ pixel nhà | 657 footprint; median diện tích 106,21 m², tương đương **1,0621 pixel diện tích** ở 10 m; 617 footprint <400 m². | Đây là diện tích chia 100 m², **không phải số pixel giao footprint**. Nó đủ giải thích vì sao không thấy mái/cửa thật; footprint và pixel không đồng nghĩa một vật thể đã được nhận dạng từ ảnh. |
| Gò địa hình | COPDEM GLO-30 DSM **109×109**, toàn bộ 11.881 giá trị hữu hạn; min/max 5,431/29,576 m. Phóng đứng **2,5×** biến relief 24,145 m thành 60,3625 m. | A/B 1× và 1,35× với cùng camera, ánh sáng và anchor. Phóng đứng là lựa chọn mô hình; DSM là bề mặt có cả cây/công trình, không phải DTM trần. |
| Độ dốc phóng đại | Kiểm sai phân tiến trên lưới: median native 1,80°, max 25,28°; max hiển thị 2,5× là 49,74°. | Chỉ là diagnostic nội bộ trên raster, không phải đo dốc thực địa. Không làm mịn rồi gọi đó là địa hình khảo sát. |
| Nhà nổi/lún tại góc | Renderer dùng trung bình tọa độ đỉnh để lấy **một** base DSM; extrusion phẳng. Height nguồn null **657/657**, proxy 4/6/9/12 m theo diện tích. | Reimplementation triangle sampler dự báo 776/3.103 đỉnh có chênh base–DSM >1 m ở 2,5×; cực trị −8,24/+8,20 m. Cần raycast/vertex QA độc lập trước khi sửa foundation. Chênh này không phải sai số cao độ thực địa. |
| Tán cây | Canopy hiện là field texture **361×361**, 119.438 pixel hợp lệ, nodata 255; renderer **0 cone**, không cộng canopy height vào Y, chỉ overlay +0,8 m. | Không đổ lỗi gò hiện tại cho cone đã bị bỏ. Raster cao tán là mô hình theo pixel, không danh sách cây cá thể. Giữ uncertainty và nodata trên UI. |
| Zoom quá gần | Camera có thể tiến sâu vào ảnh 10 m; DPR cap 1,5 và filtering là tham số màn hình. Bundled Three revision **160**. | Đặt LOD/camera theo GSD; chỉ chuyển sang vật liệu mô phỏng khi xem gần. Tăng DPR/anisotropy giúp hiển thị, không tăng thông tin địa vật. |

COPDEM được nhà cung cấp mô tả là DSM, chứa bề mặt tự nhiên và nhân tạo; vì vậy các gò có thể gồm dấu cây/nhà ở quy mô 30 m. [Copernicus DEM collection](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).

## Các kỹ thuật và điều kiện sử dụng

Các record đầy đủ về input, output, license, compute, giới hạn và snapshot nằm trong [technique-sources.json](technique-sources.json). “Công sức” dưới đây là ước lượng lập kế hoạch của nhóm, chưa phải benchmark trên máy RtR.

### T01 — Texture native, mipmap và lọc theo khoảng cách

Dùng chính PNG/COG native, tạo overview cho phạm vi lớn, giữ raster grid và UV đúng. Mipmap/linear giảm shimmer; anisotropy cải thiện mặt nhìn xiên; nearest thể hiện ô pixel rõ nhưng gây khối vuông. A/B phải so cùng camera và kích thước viewport, không kết luận một filter là ảnh có GSD tốt hơn. Three hiện tại đã có native path, nên P0 là kiểm load/fallback và close-zoom policy; không thay thư viện chỉ để “sắc” hơn. Công cụ: Three MIT; GDAL license kiểu MIT, có các thành phần kèm điều khoản riêng. CPU tạo overview; GPU browser render. [Three Texture](https://threejs.org/docs/pages/Texture.html), [GDAL gdaladdo](https://gdal.org/en/stable/programs/gdaladdo.html).

### T02 — Georegistration và chuỗi tọa độ

Giữ CRS/geotransform, pixel-center, nodata và AOI mask; reproject raster vào hệ scene hoặc tính UV từ CRS gốc như Batch 04 hiện hành. Test các điểm góc, cạnh và landmark có đối chiếu; báo residual bằng mét/pixel. Một nguồn WGS84 đúng format không tự trở thành điểm khống chế. Ngang CRS và datum cao độ phải ghi riêng; không trừ DSM–DTM trước khi kiểm datum, co-registration và epoch. GDAL `gdalwarp` xử lý phép biến đổi/resampling; phương pháp resample thay đổi mẫu chứ không bổ sung quan sát. Input đã có; effort thấp, CPU. [GDAL gdalwarp](https://gdal.org/en/stable/programs/gdalwarp.html).

### T03 — Terrain 1×, DSM/DTM và canopy có bất định

Đưa 1× thành lựa chọn đọc dữ liệu; giữ 1,35× hoặc 2,5× như chế độ nhấn địa hình và ghi hệ số. Thay hệ số phải cập nhật terrain, object base, nước và camera đồng bộ. Canopy field hiện tại nên tiếp tục là lớp raster; mesh/cây trang trí chỉ ở chế độ mô phỏng. ETH dự đoán chiều cao tán theo Sentinel-2 pixel, học từ GEDI, không có thân, loài hay vị trí từng cây. Code MIT không đồng nghĩa mọi dataset/checkpoint tự có cùng license. [ETH global canopy height implementation](https://github.com/langnico/global-canopy-height-model).

**DTM pilot đã thu:** GEDTM30 v1.2 là DTM dự đoán bằng random forest, không phải LiDAR Gia Lộc. Metadata Zenodo 06/03/2026 chỉ ra COG ngoài **30 m** và uncertainty; file đính kèm Zenodo là **240 m**, không được tải nhầm. Data CC BY 4.0; description vẫn ghi dùng để thử nghiệm. Uncertainty là độ phân tán cây random forest, không phải bảo đảm RMSE địa phương. [GEDTM30 release](https://zenodo.org/records/18887460), [primary Codeberg repository](https://codeberg.org/openlandmap/GEDTM30).

Đã thu cả hai COG qua Range, **13.238.272 byte provider**, giữ raw response bytes, headers/ranges và SHA256. Window grid gốc **109×109**, 1 arc-sec, EPSG:4326; TIFF tags ghi **EGM2008/EPSG:3855**, Float32 scale 1/offset 0. Cả hai có 11.881 pixel valid, nodata 0. DTM min/max/mean **3,8/25,7/12,950 m**; RF spread **0,17–4,42 m**, mean 0,729 m. Có GeoTIFF gốc window, PNG alpha theo pixel-center AOI và world metadata; thêm GeoTIFF **108×108 exact AOI bounds**, bilinear và ghi rõ là resampled grid. Receipt ở [gedtm-pilot/qa.json](../evidence/techniques/gedtm-pilot/qa.json).

Đối chiếu COPDEM bilinear trên grid gốc GEDTM: DSM−DTM mean **1,535 m**, median 1,202 m, p05/p95 **0,048/4,359 m**; có **497 pixel âm**, nên không xem hiệu số là height vật thể. Relief GEDTM 21,900 m, COPDEM resampled 24,145 m: DTM giảm relief vừa phải, không tự xóa toàn bộ gò; phóng đứng 2,5× vẫn là tham số cần sửa trước. [copdem-comparison.json](../evidence/techniques/gedtm-pilot/copdem-comparison.json). Chưa có checkpoints, không xác nhận accuracy thực địa; **chưa tích hợp live**.

### T04 — Mái, mặt đứng và cây PBR mô phỏng có kiểm soát

Đây là phương án thị giác tốt nhất trước khi có ảnh gần. Giữ polygon nguồn; chọn mái gable/hip/flat theo quy tắc hình học, seed theo footprint ID; khi không có bằng chứng kiểu mái, mọi lựa chọn là proxy. Mái có eave/ridge, tường có UV theo mét, roughness/normal nhẹ, palette hạn chế và ánh sáng nhất quán sẽ tăng độ đọc hình nhiều hơn cố “phóng” Sentinel. Có thể tạo các vật liệu generic tôn/ngói/bê tông bằng code và gọi đúng là vật liệu mô phỏng; không vẽ cửa/số tầng như thuộc tính đã quan sát.

Triangulation phải giữ concavity, lỗ và winding; ridge không xuyên polygon; base cần vertex QA trên terrain. Vegetation instancing chỉ biểu diễn vùng phủ hoặc mật độ mô phỏng, không gắn ID “cây thật”. Chạy deterministic small AOI pilot trước. Three `MeshStandardMaterial` là PBR; Blender Principled là công cụ authoring; Blender GPL cho phần mềm, không tự buộc tác phẩm xuất ra thành GPL. Poly Haven ghi CC0 cho assets, không phải toàn website; chưa thu asset nào ở campaign này. Effort 3–7 ngày cho pilot, CPU authoring/GPU browser; đo draw calls và mobile memory trước mở rộng. [Three PBR](https://threejs.org/docs/pages/MeshStandardMaterial.html), [Blender Principled](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html), [Blender license](https://www.blender.org/about/license/), [Poly Haven license](https://polyhaven.com/license).

### T05 — Rectify ảnh mặt đứng đã xác định đúng nhà

Homography hiệu chỉnh một mặt phẳng nhìn xiên; không dựng chiều sâu hoặc mặt sau từ một ảnh. Cần ảnh có quyền dùng, ngày chụp, footprint ID đã đối chiếu, hướng mặt đứng, camera/intrinsics hoặc control points, và review tại vị trí. EXIF GPS thường là vị trí camera, không đủ để xác nhận nhà trong ảnh. Lưu correspondence, crop và transform; gắn texture vào đúng facade normal. Mặt không quan sát dùng vật liệu trung tính có nhãn mô phỏng. OpenCV Apache-2.0; tutorial hướng dẫn planar homography và khuyến nghị `solvePnP` cho pose. Effort vài ngày khi đã có ảnh đúng; blocker hiện tại là ảnh địa phương có provenance. [OpenCV homography tutorial](https://docs.opencv.org/4.13.0/d9/dab/tutorial_homography.html).

### T06 — SfM/MVS bằng COLMAP hoặc OpenDroneMap

Cần nhiều ảnh overlap, baseline/góc chụp không suy biến, scene tương đối tĩnh, ảnh đủ texture và calibrated/estimated intrinsics. COLMAP tạo camera poses/sparse cloud bằng SfM và dense geometry bằng MVS; ODM đưa workflow hàng không đến point cloud, mesh, orthophoto, DSM/DTM. Mesh có texture là tái dựng từ ảnh, khác extrusion theo footprint. Mặt khuất, kính, nước và foliage chuyển động có thể thiếu hoặc lỗi.

Muốn đo theo mét cần scale và georeference; muốn công bố accuracy cần surveyed controls và **checkpoints giữ ngoài fitting**, residual ngang/dọc, camera/calibration report và CRS/datum. GCP không tự chứng minh accuracy ở mọi nơi. COLMAP BSD 3-clause, dependencies riêng; ODM AGPL-3.0. CPU/RAM lớn; dense MVS/CUDA tăng tốc tùy build, cần pilot vài trăm ảnh chứ chưa cam kết thời gian. Fit P2 cho một cụm nhà; không chạy từ TCI 10 m hoặc một ảnh listing. [COLMAP tutorial](https://colmap.github.io/tutorial.html), [ODM GCP](https://docs.opendronemap.org/gcp/), [COLMAP repo](https://github.com/colmap/colmap), [ODM repo](https://github.com/OpenDroneMap/ODM).

### T07 — NeRF cho novel views

Input là nhiều view của cùng scene cùng camera poses; tối ưu radiance field để synthesize góc nhìn mới. Kết quả đáng tin ở mức tái hiện appearance trong vùng được camera phủ; density không mặc nhiên là bề mặt khảo sát, và view ngoài coverage có thể lỗi. Không lấy “trông giống” làm sai số hình học. Nerfstudio Apache-2.0 là pipeline thử được, nhưng cần ảnh, poses, CUDA và benchmark ROI; không có dữ liệu này thì chưa phải cách sửa demo toàn phường. [NeRF paper](https://arxiv.org/abs/2003.08934), [Nerfstudio repo](https://github.com/nerfstudio-project/nerfstudio).

### T08 — 3D Gaussian Splatting, Spark và SuperSplat

3DGS tối ưu position/opacity/covariance/appearance của các Gaussian từ calibrated views và khởi tạo SfM. Nó cho scene thị giác sắc ở các đường camera đã được phủ, không phải mesh kín, nền khảo sát hay height từng nhà. Floaters, seams và vật thể động cần kiểm; collision/measurement phải dùng mesh hoặc survey riêng. ROI georeferenced phải đặt trong scene **1×**, không kéo height theo 2,5× rồi gọi là tọa độ thực.

`gsplat` Apache-2.0 có thể là trainer implementation; Spark MIT là renderer tích hợp Three; SuperSplat MIT là editor/viewer. Viewer không tạo dữ liệu chụp. **Original Inria implementation chỉ cho nghiên cứu/đánh giá phi thương mại**, thương mại cần consent; không ghi nhầm cả hệ sinh thái 3DGS là permissive. Data/model/assets vẫn kiểm license riêng. Fit P2 “hero” cục bộ sau capture, CUDA training và giới hạn splat count/streaming trên mobile. [Original 3DGS paper/project](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/), [original license](https://github.com/graphdeco-inria/gaussian-splatting/blob/main/LICENSE.md), [gsplat](https://github.com/nerfstudio-project/gsplat), [Spark](https://github.com/sparkjsdev/spark), [SuperSplat](https://github.com/playcanvas/supersplat).

### T09 — Multi-frame super-resolution

Có thể tận dụng nhiều ảnh low-resolution cùng vùng, subpixel shifts và mask chất lượng để khôi phục tín hiệu hơn một frame; cần registration tốt, PSF/resampling hiểu được, radiometric consistency và scene ổn định. Hai ảnh cách một năm của Batch 04 phù hợp xem change, không đủ chứng minh một burst ổn định cho SR. Trước pilot cần thu nhiều ngày gần nhau, RGB/NIR native cùng SCL và cloud masks; giữ holdout và khi có thể có HR tham chiếu.

HighRes-net là paper/repo multiframe nghiên cứu trên **PROBA-V**, không phải Sentinel weights có thể thả vào ngay. Repository có **Apache-2.0 cộng Do No Harm modified**, không phải Apache đơn thuần; cần phù hợp điều khoản tổ chức trước dùng. Compute training GPU; adaptation/validation trung bình đến cao; chưa ưu tiên hơn PBR/terrain P0. Output là reconstructed grid, không mặt đứng/roof đã quan sát. [HighRes-net paper](https://arxiv.org/abs/2002.06460), [official repo/license](https://github.com/ServiceNow/HighRes-net).

### T10 — Learned SR / diffusion và superresolve bands

ESAOpenSR LDSR-S2 dùng RGB-NIR Sentinel-2; pipeline chính đọc **4-band GeoTIFF/.SAFE**, không chỉ TCI PNG ba kênh. B04 chưa có input này cho pilot. Code/model repository giữ license MIT và MIT-CompVis cho phần LDM; chưa tải/check weights, nên chưa chứng nhận license mọi checkpoint. Pixel mới có chi tiết suy đoán; nếu thử phải xuất lớp riêng ghi “SR mô hình, GSD đầu vào 10 m”, giữ ảnh gốc và seed/model/version. Không dùng để xác nhận nhà mới, cửa sổ hoặc đường ranh.

OpenSR-test MIT cung cấp kiểm spectral/spatial consistency và hallucination với HR; tại Gia Lộc hiện thiếu HR nên chưa thể công bố “hết hallucination”. DSen2 xử lý các band Sentinel 20/60 m lên 10 m: đây **không phải** bằng chứng RGB 10 m lên chi tiết nhà dưới mét. GPU inference pilot có thể ngắn; accuracy/HR validation mới là blocker. [ESAOpenSR model](https://github.com/ESAOpenSR/opensr-model), [OpenSR-test](https://github.com/ESAOpenSR/opensr-test), [DSen2 paper](https://arxiv.org/abs/1803.04271), [Sentinel-2 bands](https://sentiwiki.copernicus.eu/web/s2-mission).

### T11 — Stereo DSM và height công trình

Cần stereo pair có baseline/parallax, ảnh đủ GSD, camera model/RPC và metadata; ASP có pipeline stereo để tạo point cloud/DEM. Vệ tinh quan sát hai epoch không tự là stereo pair phù hợp. Muốn height nhà dùng DSM–DTM cùng grid/datum đã kiểm, mask footprint và robust statistics, kèm controls/checkpoints; vegetation và epoch khác làm sai hiệu số. Không trừ canopy height model khỏi COPDEM để suy ra nền từng nhà. Sentinel 10 m và COPDEM 30 m hiện không giải quyết height 657 công trình; OpenTopography baseline không có local dense PointCloud. ASP Apache-2.0, CPU/RAM lớn và parallel stereo; fit P3 khi có imagery/capture đúng. [ASP docs](https://stereopipeline.readthedocs.io/en/latest/), [ASP repo](https://github.com/NeoGeographyToolkit/StereoPipeline).

### T12 — GIS/LOD: giữ Three pilot, mở rộng bằng tiles khi cần

3D Tiles quy định tổ chức/streaming dữ liệu 3D, bounding volumes và geometric error; Cesium xử lý LOD/camera geospatial, MapLibre cho map/terrain GIS. Đổi engine không tạo ảnh local sắc hơn, cũng không nâng accuracy của source. Trong AOI 3,3 km, giữ Three và native texture hiện tại; thêm mesh/material LOD và typed source registry. Khi mở phạm vi lớn, thử Cesium/3D Tiles cho terrain/buildings/point clouds; MapLibre cho truy vấn map 2D. Kiểm CRS→ECEF/local frame, bounding volumes, error budget và GPU memory, không dùng geometricError như survey RMSE. Cesium Apache-2.0, MapLibre BSD-3-clause với notices/components riêng, Three MIT; license tiles/imagery tách khỏi engine. Effort thấp cho LOD local, cao cho migration và tiling cả đô thị. [OGC 3D Tiles 1.1](https://docs.ogc.org/cs/22-025r4/22-025r4.html), [Cesium3DTileset](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html), [MapLibre terrain](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/).

## Roadmap cụ thể và cổng nghiệm thu

| Giai đoạn | Công việc / deliverable | Input & blocker | Kiểm chấp nhận |
|---|---|---|---|
| **P0 — 1–2 ngày ước lượng** | Native/fallback load gate; GSD-aware close view; terrain A/B 1×/1,35×; foundation vertex audit; cùng camera preset để so. | Toàn bộ input đã có. Raycast browser chưa thực hiện trong nghiên cứu này. | Probe xác nhận 330×334 không đổi bytes; texture alignment tại landmark; không mute disclosure; case nhà nổi/lún có receipt; hệ số height đồng bộ. |
| **P1 — 3–7 ngày pilot** | Deterministic PBR roofs/facades, 3 loại mái generic, instanced vegetation chỉ ở mode mô phỏng; neutral map ở mode dữ liệu. | Footprint hiện có, không có observed height/roof/material. Nếu dùng asset ngoài: thu asset+license riêng. | Same ID nguồn; null giữ null; winding/holes/UV theo mét; no intersection ngoài polygon; screenshot desktop/mobile, frame budget và memory đo thực. |
| **P1b — bounded DTM đã thu** | COG GEDTM30 v1.2 30 m + RF spread đã đọc/clip/QA, so DSM cùng datum/grid; không live swap. | Release testing-only, thiếu survey checkpoints. | Actual CRS/scale/nodata/stat/hash và PNG+world receipt đã có; không nhầm file 240 m; relief chỉ là đối chiếu 2 sản phẩm. |
| **P2 — capture pilot** | Một cụm nhà: capture plan, permits/license nếu cần, SfM/MVS textured mesh và optional gsplat hero; facade photos matched. | Đủ góc/overlap/camera/controls và ground access. HCMC assets chỉ tái dùng pipeline, không thay Gia Lộc facts. | Dataset provenance/date, heldout checkpoint residuals, reprojection diagnostics, coverage/no-data; matched-camera visual review tách khỏi geometry accuracy. |
| **P2b — SR nghiên cứu** | Thu raw RGB/NIR/SCL và dates gần; chạy small ROI OpenSR baseline + model, export riêng. | Thiếu band và HR reference; MFSR còn thiếu stable sequence; weights license chưa khóa. | Spectral/spatial consistency; HR metrics khi có; original always accessible; không gán SR thành ảnh quan sát hoặc detection nhà thật. |
| **P3 — survey/scale** | Hera/aerial/stereo/LiDAR đã QA; measured mesh/heights; tiles streaming khi phạm vi tăng. | Camera/RPC/point cloud, controls, datum/geoid, budgets và license nguồn. | AC địa chính/ortho/cm chỉ xét sau khảo sát và independent checkpoints; không lấy renderer/splat sắc làm pass. |

Các con số effort là engineering estimate cho pilot, không bao gồm thu phép chụp, khảo sát hoặc mua dữ liệu; phải benchmark trước cam kết production. Không triển khai mode/fix nào trong đợt nghiên cứu này.

## Vì sao bài “3D worlds” nhìn thật hơn

Bài của Matt Shumer tự mô tả pipeline dùng OSM, footprint cấp county, USGS LiDAR và ảnh listing; tạo tài sản Blender rồi review ảnh render ở camera khớp ảnh tham chiếu. Đây là tổ hợp input giàu hơn Sentinel 10 m + DSM 30 m + footprint null-height của Batch 04. Có thể học cách dựng vật liệu và review camera, nhưng bài không cung cấp khảo sát đo accuracy độc lập, và ảnh/asset của khu Mỹ không phải dữ liệu Gia Lộc. [Primary process article](https://somethingbig.ai/3d-worlds). Đoạn này là paraphrase dưới 200 từ, không trích nguyên văn.

## Kỷ luật bằng chứng

Mỗi technique có URL primary, repository commit, snapshot bytes và SHA256; [acquisition-index.json](../evidence/techniques/acquisition-index.json) lưu cả attempts. OpenCV docs HTTP403 được thay bằng chính tutorial trong repo official pinned commit; attempt URL sai404 cũng được lưu. License source code không thay license imagery/weights/assets. Repo pin theo commit tại thời điểm rà, docs latest là snapshot ngày rà; Three docs hiện hành không được coi là API bảo đảm tương thích r160, cần test API cụ thể trước coding. Không có local photo, SR, mesh, splat hay license asset thương mại nào được giả là đã thu.

Độ đẹp đánh giá bằng matched-camera photos và screenshot/viewpoint coverage. Độ chính xác đánh giá bằng controls/checkpoints không dùng fit, residuals, CRS/datum và coverage. C05 hoàn thành nghiên cứu, source diagnosis và bounded DTM pilot thực giao AOI; mọi tuyên bố địa chính, true ortho ~1 cm, height từng nhà, cây cá thể, LiDAR đô thị hoặc flood model đều chưa được đáp ứng.
