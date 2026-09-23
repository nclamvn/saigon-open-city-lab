#!/usr/bin/env python3
"""Freeze hand-reviewed claims with verbatim spans from captured snapshots."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SNAPSHOTS = ROOT / "snapshots"
MANIFEST = json.loads((ROOT / "capture-manifest.json").read_text(encoding="utf-8"))
CAPTURES = {record["id"]: record for record in MANIFEST["sources"]}


def text(source_id: str) -> str:
    return (SNAPSHOTS / f"{source_id}.html").read_text(encoding="utf-8")


def line(source_id: str, needle: str) -> str:
    matches = [candidate.strip() for candidate in text(source_id).splitlines() if needle in candidate]
    if not matches:
        raise ValueError(f"Missing evidence: {source_id}: {needle}")
    return matches[0]


def block(source_id: str, start: str, end: str) -> str:
    body = text(source_id)
    left = body.index(start)
    right = body.index(end, left) + len(end)
    return body[left:right]


claims: list[dict] = []


def claim(entity, source_id, field, value, evidence_span, extraction="normalized", tier="A"):
    capture = CAPTURES[source_id]
    claims.append(
        {
            "entity": entity,
            "field": field,
            "value": value,
            "evidence_span": evidence_span,
            "extraction": extraction,
            "tier": tier,
            "capture": {
                "url": capture["url"],
                "fetched_at": capture["fetched_at"],
                "snapshot": f"{source_id}.html",
                "source": capture["url"].split("/")[2],
                "raw_sha256": capture["raw_sha256"],
            },
        }
    )


# Local official evidence and calibration targets.
entity = "HCMC warning-marker study 1990-2024"
sid = "hcmc-warning-markers"
claim(entity, sid, "name", "Hệ thống mốc cảnh báo ngập lụt TP.HCM", line(sid, "TP. Hồ Chí Minh xây dựng hệ thống mốc cảnh báo ngập lụt"))
claim(entity, sid, "publisher", "Sở Khoa học và Công nghệ TP.HCM", line(sid, "Sở Khoa học và Công nghệ TP. Hồ Chí Minh vừa tổ chức"))
claim(entity, sid, "role", "official_warning_method", line(sid, "đề xuất mực nước tương ứng với cấp báo động"), "inferred")
claim(entity, sid, "temporal_resolution", "historical series 1990-2024", line(sid, "chuỗi số liệu khí tượng thủy văn từ năm 1990 đến năm 2024"))
claim(entity, sid, "spatial_resolution", "digital flood map 1:50,000", line(sid, "bản đồ ngập lụt số hóa tỷ lệ 1/50.000"))
claim(entity, sid, "evidence_value", "three alert levels from compound tide, flood and urban rainfall scenarios", line(sid, "ba cấp độ báo động dựa trên các kịch bản tổ hợp"))
claim(entity, sid, "access", "public official article", line(sid, "Tin hoạt động Sở"), "inferred")

entity = "Thao Dien compound flood event 2025-10-08"
sid = "hcmc-thao-dien-2025"
claim(entity, sid, "name", "Mưa lớn kết hợp triều cường gây ngập nhiều nơi", line(sid, "TPHCM: Mưa lớn kết hợp triều cường gây ngập nhiều nơi"))
claim(entity, sid, "publisher", "Hội đồng nhân dân TP.HCM", line(sid, "HĐND TP HỒ CHÍ MINH"))
claim(entity, sid, "role", "observed_compound_event", line(sid, "Mưa lớn kết hợp triều cường gây ngập"), "inferred")
claim(entity, sid, "temporal_resolution", "event on 2025-10-08", line(sid, "tối 8-10 khiến nhiều tuyến đường"), "normalized")
claim(entity, sid, "spatial_resolution", "named road segments in Thao Dien", line(sid, "đường Quốc Hương ngập sâu từ 30-50cm"), "normalized")
claim(entity, sid, "evidence_value", "Quoc Huong 0.30-0.50 m; Thao Dien about 0.40 m", line(sid, "đường Quốc Hương ngập sâu từ 30-50cm"))
claim(entity, sid, "access", "public official news page", line(sid, "CỔNG THÔNG TIN ĐIỆN TỬ"), "inferred")
claim(entity, sid, "limitation", "event observation without a published rain hyetograph or tide hydrograph", line(sid, "rãnh áp thấp hoạt động mạnh gây mưa lớn trên diện rộng"), "inferred")

entity = "HCMC AI urban flood early-warning report 2022"
sid = "hcmc-early-warning-report"
claim(entity, sid, "name", "Hệ thống cảnh báo sớm ngập lụt đô thị dựa trên AI tại TP.HCM", block(sid, "ĐỀ TÀI: “NGHIÊN CỨU, XÂY DỰNG", "TRÍ TUỆ NHÂN TẠO TẠI THÀNH PHỐ HỒ CHÍ MINH”"))
claim(entity, sid, "publisher", "Đài Khí tượng Thủy văn khu vực Nam Bộ", line(sid, "Cơ quan chủ trì:      Đài Khí tượng Thuỷ văn khu vực Nam Bộ"))
claim(entity, sid, "role", "observed_event_and_model_calibration", line(sid, "XÂY DỰNG VÀ TRIỂN KHAI THỬ NGHIỆM"), "inferred")
claim(entity, sid, "temporal_resolution", "event observations; project 2020-2022", line(sid, "Từ tháng: 12/2020 đến tháng 12/2022"))
claim(entity, sid, "spatial_resolution", "road and station observations", line(sid, "Đường Nguyễn Văn Hưởng ngập ngày 14/5/2020"), "normalized")
claim(entity, sid, "evidence_value", "near-200 mm rainfall; flooding over 6 hours in Thao Dien corridor", block(sid, "Ngày 07/8, trận mưa lớn với lượng mưa đo được tại Thanh Đa gần 200mm,", "kéo dài có nơi lên tới hơn 6 giờ."))
claim(entity, sid, "access", "public official research PDF", line(sid, "BÁO CÁO TỔNG HỢP"), "inferred")
claim(entity, sid, "limitation", "2022 research report; not a live operational feed", line(sid, "Thành phố Hồ Chí Minh, 11/2022"), "inferred")

# Solver and public fallback sources.
entity = "EPA SWMM"
sid = "epa-swmm"
claim(entity, sid, "name", "Storm Water Management Model (SWMM)", line(sid, "Storm Water Management Model (SWMM)"))
claim(entity, sid, "publisher", "United States Environmental Protection Agency", line(sid, "EPA's Storm Water Management Model"), "normalized")
claim(entity, sid, "role", "drainage_1d_solver", line(sid, "drainage system modeling"), "inferred")
claim(entity, sid, "access", "open source and freely available worldwide", line(sid, "open source, publicly, and freely available"))
claim(entity, sid, "evidence_value", "dynamic-wave drainage routing and heterogeneous subcatchments", line(sid, "full dynamic wave hydraulic flow routing methods"), "normalized")
claim(entity, sid, "license", "open source", line(sid, "open source, publicly, and freely available"), "normalized")

entity = "HEC-RAS 2D precipitation boundary"
sid = "hec-ras-2d-rainfall"
claim(entity, sid, "name", "HEC-RAS 2D global boundary conditions", line(sid, "Global Boundary Conditions"))
claim(entity, sid, "publisher", "HEC-RAS", line(sid, "HEC-RAS 2D User's Manual"), "normalized")
claim(entity, sid, "role", "surface_2d_solver_input", line(sid, "spatially varying precipitation"), "inferred")
claim(entity, sid, "spatial_resolution", "gridded or point-gage precipitation", line(sid, "either gridded data, point gage data, or a constant rate"))
claim(entity, sid, "evidence_value", "point gauges are interpolated to a grid for the computational engine", line(sid, "This data is then interpolated in order to convert it to a gridded data form"))
claim(entity, sid, "access", "public technical documentation", line(sid, "Download page"), "inferred")
claim(entity, sid, "limitation", "not recommended where coastal wave forcing is significant", line(sid, "It is not recommended to use HEC-RAS as a coastal model"))

entity = "NASA GPM IMERG V07"
sid = "nasa-imerg-v07"
claim(entity, sid, "name", "Integrated Multi-satellitE Retrievals for GPM (IMERG)", line(sid, "IMERG: Integrated Multi-satellitE Retrievals for GPM"))
claim(entity, sid, "publisher", "NASA Global Precipitation Measurement Mission", line(sid, "NASA Global Precipitation Measurement Mission"), "normalized")
claim(entity, sid, "role", "public_rainfall_fallback", line(sid, "estimate precipitation over the majority of the Earth's surface"), "inferred")
claim(entity, sid, "temporal_resolution", "half-hourly", line(sid, "updated every half-hour"), "normalized")
claim(entity, sid, "access", "free Earthdata registration", line(sid, "Register for free with NASA Earthdata"), "normalized")
claim(entity, sid, "evidence_value", "Early Run nominal latency about 4 hours", line(sid, "Early Run provides the lowest latency available (4 hours)"), "normalized")
claim(entity, sid, "limitation", "regridding can suppress precipitation maxima and expand rain events", line(sid, "many interpolation schemes have the property of suppressing maxima"), "normalized")

entity = "ERA5-Land"
sid = "era5-land"
claim(entity, sid, "name", "ERA5-Land hourly data from 1950 to present", line(sid, "ERA5-Land hourly data from 1950 to present"), "verbatim")
claim(entity, sid, "publisher", "Copernicus Climate Data Store / ECMWF", line(sid, "ECMWF ERA5 climate reanalysis"), "normalized")
claim(entity, sid, "role", "historical_climate_fallback", line(sid, "flood or drought forecasting"), "inferred")
claim(entity, sid, "temporal_resolution", "hourly", line(sid, "Hourly"), "normalized")
claim(entity, sid, "spatial_resolution", "0.1 degree; native 9 km", line(sid, "0.1° x 0.1°; Native resolution is 9 km."), "normalized")
claim(entity, sid, "access", "downloadable analysis-ready data", line(sid, "Analysis ready data"), "normalized")
claim(entity, sid, "limitation", "model estimates have uncertainty that grows back in time", line(sid, "uncertainty of model estimates grows as we go back in time"), "normalized")
claim(entity, sid, "license", "CC-BY", line(sid, "CC-BY licence"), "normalized")

entity = "Copernicus DEM GLO-30"
sid = "copernicus-dem-glo30"
claim(entity, sid, "name", "Copernicus DEM GLO-30", line(sid, "GLO-30 offers global coverage"), "normalized")
claim(entity, sid, "publisher", "Copernicus Data Space Ecosystem", line(sid, "Copernicus Data Space Ecosystem"), "normalized")
claim(entity, sid, "role", "public_terrain_proxy", line(sid, "Digital Surface Model (DSM)"), "inferred")
claim(entity, sid, "spatial_resolution", "30 m global coverage", line(sid, "GLO-30 offers global coverage at a resolution of 30 metres."), "normalized")
claim(entity, sid, "access", "free access to 30 m and 90 m instances", line(sid, "can freely access the 30m and 90m resolution instances"), "normalized")
claim(entity, sid, "limitation", "DSM includes buildings, infrastructure and vegetation; it is not a bare-earth DTM", line(sid, "represents the top-reflective surface of the Earth including buildings"), "normalized")
claim(entity, sid, "license", "ESA User licence for CCM", line(sid, "ESA-User license for the use of CCM"), "normalized")

entity = "Copernicus Sentinel-1 GRD"
sid = "sentinel-1-grd"
claim(entity, sid, "name", "Sentinel-1 GRD", line(sid, "Sentinel-1 (RAW, GRD, SLC)"), "normalized")
claim(entity, sid, "publisher", "Copernicus Data Space Ecosystem", line(sid, "Copernicus Data Space Ecosystem"), "normalized")
claim(entity, sid, "role", "earth_observation_validation", line(sid, "reliable and repeated wide area monitoring"), "inferred")
claim(entity, sid, "spatial_resolution", "high-resolution land and coastal imagery; product-dependent", line(sid, "captures high-resolution images of all landmasses"), "normalized")
claim(entity, sid, "access", "GRD archive accessible through Copernicus Data Space", line(sid, "entire archive of COG_SAFE products will be available immediately"), "normalized")
claim(entity, sid, "evidence_value", "C-band SAR observes day/night and all weather", line(sid, "capture images in all weather conditions"), "normalized")

(ROOT / "claims.jsonl").write_text(
    "".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in claims),
    encoding="utf-8",
)
print(json.dumps({"claims": len(claims), "entities": len({c['entity'] for c in claims})}, indent=2))
