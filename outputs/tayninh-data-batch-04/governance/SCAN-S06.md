# SCAN-S06 — Contractor

Ngày14/09/2026, trước hợp nhất S06. Bản đồ hiện hành tại localhost8768/tayninh-data-batch-04/. Không có AGENTS.md/package.json tìm thấy trong project scan. Static localThree renderer, Python offline compiler, localInter; sáu analysis modes.

## Đã có

- B01 AOI kỹ thuật; B02 Sentinelnative330×33410m và657 Microsoftfootprints; B03 canopyETH2020 vàJRC.
- B04 fusion scene, visualgeoregistration, on-demandrender, keyboard/pointer/zoom/tour/reset/pick, collapse/source drawer.
- C05 đã thu GoogleOpenBuildings4mcrop3bands và GEDTMnative109²+RFspread, sourcehash/QA/rights/epochs; Commonsphoto chưađịnhvị.

## Vấn đề cần giải quyết

- Fusion terrain lưu exag2.5 và currentrenderer áp dụng mặc định; sourceCOPDEM làDSM. Cảnh phóng relief24,145m thành60,36m.
- Building làbareextrusion proxyheight; bottom chỉcentroid, no roof/facadePBR; currentgroundingproof tựso với constructionsampler, khôngindependent.
- Roads làyellowTube/Catmullcurve withwidthproxy, overshootpossible; câyanalyticcontinuouscorrect nhưng chưa có graphicvegetation chi tiết trongoverview.
- app.js tập trung data/load/geometry/material/controls/inspection/perf, chưa có boundary sourceadapter/solutionmodule. Diagnostic drawImage/getImageData có thểđồngbộGPU, chưa có numericframe-cost/memory report.
- Persistentparagraphs/panels cần gọn hơn; newlayerstatesphảiđồngbộ sourceinspector/controls.

## Baseline runtime từ DOM probe của browser22

Renderer/scene ready; modeoverview. Camera(-997,73;1147,10;1233,81), radius1936,96m. Exag2.5.657buildings/260renderedroads/119438canopyvalid/0cones/114JRCcells/8pickables. Texture330×334loaded. Terrain109², X[-1638,010092;1639,121889], Z[-1683,532898;1656,051826]. Grounding2751constructionreferences, clearance0, independentfalse. UIidle“Đứngyên”. Các số này mô tả renderer, không đo accuracy thực địa.

## Decisions

1. Áp dụng userrequestedC05 ngay, giữupstream/raw/sceneIDs, data bổsung trongderived/solution/. Khôngregenfusionchỉđểđổi defaultscale.
2. Sourceadapter/QA chạyoffline; scene descriptors nhẹ; renderer module riêng đểsửdụnglại. GiữThree vàlocalserver, chưa migrateengine khi chưa có scale/perf requirement chứngminh.
3. Default1×; GEDTMmodeltesting-only cósourcefallback COPDEM. HeightGooglequalifiedmodel hoặcareaproxy; measuredheight không bị ghi đè.
4. Graphicdetail/genericroofs/veg riêng với analytic evidence, dựa footprint/masks và không tự gán observations. Commons không phủ nhà chưa biếttọađộ.
5. Kiểmtrianglegeometry+raycast nềnđộc lập, provenance/nodata/fallback và realbrowser interaction/perf; tách measuredaccuracy khỏi rendering consistency.
6. Ba TIP độc lậpData/Engine/UX, mỗiBuilderownfiles tránhconflicts, phối hợp schema/eventcontract. Contractor khôngcode; kiểmoutput vàgovernance.
7. Bỏgate hỏi lại Blueprint vì user đã yêu cầu triển khai trực tiếp trongscope; source/techniquechoices đãnghiêncứuC05. Localreview/Verify làhandoff, khôngship bênngoài.

Acceptance matrix ởBLUEPRINT-SOLUTION-06.md,14requirements. Blueprint khônghứaRGBsubmeter/LiDAR/surveyaccuracy hoặc hoàn thànhtoàn bộdigitaltwin bằngdata hiệncó.
