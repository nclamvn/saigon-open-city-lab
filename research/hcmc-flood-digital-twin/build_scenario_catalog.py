#!/usr/bin/env python3
"""Build a bounded scenario catalogue; missing physics inputs fail closed."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
REGISTRY_PATH = PROJECT / "outputs/hcmc-poc/data/flood-source-registry-25.json"
OUT = PROJECT / "outputs/hcmc-poc/data/flood-scenario-catalog-25.json"


def digest(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
source_ids = {entity["id"] for entity in registry["entities"]}

required_sources = {
    "Thao Dien compound flood event 2025-10-08",
    "HCMC AI urban flood early-warning report 2022",
    "HCMC warning-marker study 1990-2024",
}
missing = sorted(required_sources - source_ids)
if missing:
    raise SystemExit(f"Scenario source gate failed: {missing}")

catalog = {
    "version": "25a",
    "status": "bounded_catalog_ready_solver_inputs_incomplete",
    "registryDigest": registry["registryDigest"],
    "policy": {
        "unboundedControls": False,
        "observedPairsKeepTimestamps": True,
        "syntheticPairsRequireJointProbability": True,
        "stressTestsNeverPublishedAsForecasts": True,
        "missingInputsDisableRun": True,
    },
    "citywide": {
        "targetCoverage": "official HCMC administrative extent",
        "strategy": "multi-resolution catchment tiles",
        "warningLevels": 3,
        "warningThresholdStatus": "pending official matrix and vertical datum",
    },
    "scenarios": [
        {
            "id": "observed-thao-dien-2025-10-08",
            "kind": "observed_compound_event",
            "label": "Thảo Điền · 08/10/2025",
            "status": "calibration_target_not_runnable",
            "rain": {"hyetograph": None, "totalMm": None, "sourceState": "not_published_in_captured_source"},
            "tide": {"hydrograph": None, "stageM": None, "datum": None, "sourceState": "not_published_in_captured_source"},
            "observed": {"quocHuongDepthM": [0.30, 0.50], "thaoDienDepthM": 0.40},
            "blockedBy": ["rain hyetograph", "tide hydrograph", "vertical datum", "DTM", "drainage network"],
            "sourceIds": ["Thao Dien compound flood event 2025-10-08"],
        },
        {
            "id": "observed-thao-dien-august-report",
            "kind": "historical_reconstruction",
            "label": "Thảo Điền · trận mưa gần 200 mm",
            "status": "calibration_target_not_runnable",
            "rain": {"totalApproxMm": 200, "hyetograph": None, "sourceState": "total_approximate"},
            "tide": {"hydrograph": None, "stageM": None, "datum": None},
            "observed": {"durationHoursLowerBound": 6, "nguyenVanHuongDepthM": 0.25},
            "blockedBy": ["exact event year/time", "rain hyetograph", "tide hydrograph", "vertical datum", "DTM", "drainage network"],
            "sourceIds": ["HCMC AI urban flood early-warning report 2022"],
        },
        {
            "id": "design-rain-plus-tide",
            "kind": "design_scenario_family",
            "label": "Mưa thiết kế + triều có xác suất đồng thời",
            "status": "blocked_missing_official_curves",
            "rain": {"control": "approved return period", "bounds": None},
            "tide": {"control": "official alert hydrograph", "bounds": None},
            "blockedBy": ["station IDF/DDF curves", "joint-probability method", "official alert thresholds", "vertical datum"],
            "sourceIds": ["HCMC warning-marker study 1990-2024"],
        },
        {
            "id": "public-data-screening",
            "kind": "screening_only",
            "label": "Sàng lọc toàn thành phố bằng dữ liệu công khai",
            "status": "forcing_sources_ready_terrain_insufficient",
            "rain": {"source": "NASA GPM IMERG V07", "temporalResolution": "half-hourly"},
            "terrain": {"source": "Copernicus DEM GLO-30", "resolutionM": 30, "surfaceType": "DSM"},
            "validation": {"source": "Copernicus Sentinel-1 GRD"},
            "allowedUse": "regional screening and pipeline testing",
            "forbiddenUse": "street-depth forecast or engineering design",
            "sourceIds": ["NASA GPM IMERG V07", "Copernicus DEM GLO-30", "Copernicus Sentinel-1 GRD"],
        },
    ],
}

for scenario in catalog["scenarios"]:
    unknown = sorted(set(scenario["sourceIds"]) - source_ids)
    if unknown:
        raise SystemExit(f"Unknown scenario source: {scenario['id']}: {unknown}")
catalog["catalogDigest"] = digest(catalog)
OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"scenarios": len(catalog["scenarios"]), "digest": catalog["catalogDigest"]}, indent=2))
