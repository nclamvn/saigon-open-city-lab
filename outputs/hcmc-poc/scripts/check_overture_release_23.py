#!/usr/bin/env python3
"""Check the official Overture release calendar without changing production data."""
from __future__ import annotations

import argparse
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
OFFICIAL_URL = "https://docs.overturemaps.org/release-calendar/"
PINNED = {
    "retrievedAt": "2026-09-17T00:00:00+07:00",
    "currentRelease": "2026-08-19.0",
    "nextScheduledRelease": "2026-09-23.0",
    "nextScheduledDate": "2026-09-23",
    "scheduleIsProposed": True,
}


def parse(html: str) -> dict:
    versions = re.findall(r"20\d{2}-\d{2}-\d{2}\.\d+", html)
    if not versions:
        raise ValueError("Không tìm thấy phiên bản Overture trong trang chính thức")
    unique = list(dict.fromkeys(versions))
    # The official page places the current release before the proposed schedule.
    current_match = re.search(r"Current release[\s\S]{0,1200}?(20\d{2}-\d{2}-\d{2}\.\d+)", html, re.I)
    return {"currentRelease": current_match.group(1) if current_match else unique[0], "versionsObserved": unique[:16]}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check-network", action="store_true", help="Đọc lịch phát hành chính thức ngay lúc chạy")
    ap.add_argument("--html", type=Path, help="Kiểm thử parser bằng tệp HTML cục bộ")
    ap.add_argument("--out", type=Path, default=APP / "data" / "overture-refresh-23.json")
    args = ap.parse_args()
    observed = dict(PINNED)
    mode = "pinned_official_snapshot"
    if args.html:
        observed.update(parse(args.html.read_text(errors="replace")))
        mode = "local_html"
    elif args.check_network:
        request = urllib.request.Request(OFFICIAL_URL, headers={"User-Agent": "RtR-CityLab-release-check/23a"})
        with urllib.request.urlopen(request, timeout=20) as response:
            observed.update(parse(response.read().decode("utf-8", "replace")))
        observed["retrievedAt"] = datetime.now(timezone.utc).isoformat()
        mode = "official_network_check"
    scene = json.loads((APP / "data" / "scene.json").read_text())
    integrated = scene["meta"]["overture"]["release"]
    latest = observed["currentRelease"]
    status = "current" if latest == integrated else "new_release_available"
    report = {
        "version": "23a",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "officialUrl": OFFICIAL_URL,
        "integratedRelease": integrated,
        "officialCurrentRelease": latest,
        "status": status,
        "nextScheduledRelease": observed.get("nextScheduledRelease"),
        "nextScheduledDate": observed.get("nextScheduledDate"),
        "scheduleIsProposed": observed.get("scheduleIsProposed", True),
        "automaticIngestion": False,
        "gate": "Tải vùng, so sánh GERS/hình học, chạy QA và duyệt thủ công trước khi thay snapshot.",
        "sourceSnapshot": observed,
    }
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
