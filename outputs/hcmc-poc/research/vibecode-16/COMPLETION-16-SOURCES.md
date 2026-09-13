# Completion Report — TIP-16-SOURCES

STATUS: DONE (source registry); future planning geometry remains unavailable.

## Files changed

Created data/planning-16.json and planning-16.js; scripts/validate_planning_16.py; research/vibecode-16/TIP-16-SOURCES.md, this report, planning-validation.json and source-snapshots (manifest, two HTML archives, verification notes and SHA-256).

## Requirement coverage and acceptance

4/4 AC implemented (100%). AC-S1 PASS: four records, mandatory dates, publisher, scope, reuse limits, distinction between approval and reporting. AC-S2 PASS: no future geometry or invented stage, top-level and per-source readiness false. AC-S3 PASS: JSON/JS identity, two HTML hash checks and metadata hash check. AC-S4 PASS: all six unsafe fixtures rejected (enable geometry, claim approval, remove scope, invent timeline, inject geometry, replace official URL).

Command: `python3 outputs/hcmc-poc/scripts/validate_planning_16.py`.
Technical health: validator PASS; 6/6 negative scenarios rejected; Python compilation PASS. No frontend code changed; browser QA belongs to UI integration TIP. Build/type/lint not applicable to JSON and standard-library Python changes. No external services written to.

## Verified sources and limits

1. [HĐND 09/09/2026 — công tác lập quy hoạch tầm nhìn 100 năm](https://hdnd.hochiminhcity.gov.vn/tin-tuc/ban-do-thi/ban-do-thi-hdnd-thanh-pho-khao-sat-cong-tac-lap-quy-hoach-tong-thethanh-pho-ho-chi-minh-tam-nhin-100-nam): article from the official council, publicly read and HTML archived. Describes work still being refined, not an approval decision. Mentions post-merger city; it must not be confused with our central-area sample.
2. [HĐND 02/06/2026 — hội thảo quy hoạch](https://hdnd.hochiminhcity.gov.vn/tin-tuc/tin-tong-hop/quy-hoach-tong-the-thanh-pho-ho-chi-minh-khat-vong-the-ky-cua-mot-sieu-do-thi): publicly read and HTML archived. Explicitly records that this council-hosted article republishes Nhân Dân (Vương Lê), not a planning dossier.
3. [Sở QHKT — GIS metro dự kiến, 19/05/2026](https://qhkt.hochiminhcity.gov.vn/tai-lieu-hop/mang-luoi-duong-sat-do-thi-du-kien-cua-thanh-pho-ho-chi-minh-theo-nghi-quyet-so-06-nqtu-da-the-hien-tren-ban-do-gis-3628.html): date and title verified in the [official directory](https://qhkt.hochiminhcity.gov.vn/tai-lieu-hop.html). Detail page via web exposes related list, not downloadable geometry. Direct HTML acquisition timed out. The official portal link leads to [GIS tra cứu](https://gisxaydung.tphcm.gov.vn/tracuuttqh); web returned no layer content. No GIS import claimed.
4. [Sở QHKT — bản vẽ đồ án 2040/2060, 08/05/2026](https://qhkt.hochiminhcity.gov.vn/tai-lieu-hop/ban-ve-do-an-dieu-chinh-quy-hoach-chung-tphcm-den-nam-2040-tam-nhin-den-nam-2060-3623.html): a useful additional source lead, title/date verified in directory, original drawings not acquired or assessed. Do not infer territorial scope or approval date from page publication date. Do not merge this dossier into the new post-merger 100-year vision.

Retrieval/verification date: 13/09/2026, separate from publication dates. Archive manifest records successful HTTP status, final URL, bytes and hash; three failed downloads explicitly show timeout errors. Verification notes are metadata, not mislabeled source HTML.

## Missing for future geometry

Authoritative dossier and approval/version status; territorial scope; GIS/CAD or georeferenced drawings with CRS and scale; land-use boundary and intensity/height controls; documented phasing; rights to reuse; responsible planning expert's review. These are exposed in the registry rather than hidden.

## Deviations and suggestions

Added one directly linked official drawings lead (2040/2060) because it gives a concrete next collection route. No architecture or UI contract changed. Suggest next data request target these two Sở QHKT leads; obtain files and versioned approval status before generating any future scene. No request was sent externally.

OVERALL: READY with deferred acquisition of authoritative geometry; no claim that future-planning visualization is complete.
