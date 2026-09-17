#!/usr/bin/env python3
"""bites.py · Bộ răng cho refinery engine.

Doctrine: một cổng chưa được chứng là biết cắn thì chưa được tin, dù đang báo xanh.
Mỗi bite: copy domain ra thư mục tạm → tiêm một lỗi đúng loại cổng đó canh →
xác nhận cổng cắn (GateError đúng tên gate, hoặc exit 2) → vứt bản tạm (khôi phục).

Chạy:  python bites.py domains/durian
"""
import os, sys, json, shutil, tempfile, subprocess, re
from pathlib import Path
import refinery

CJK = re.compile(r"[㐀-鿿豈-﫿]")


def _copy(domain_dir):
    tmp = Path(tempfile.mkdtemp(prefix="refbite_"))
    dst = tmp / "domain"
    shutil.copytree(domain_dir, dst)
    return tmp, dst


def _expect_bite(dst, want_gate, env=None):
    """Chạy pipeline trên bản đã tiêm lỗi, kỳ vọng GateError đúng gate."""
    e = dict(os.environ)
    if env:
        e.update(env)
    # chạy như subprocess để bắt cả exit code 2 (fail-loud thật)
    r = subprocess.run([sys.executable, str(Path(__file__).parent / "refinery.py"), str(dst)],
                       capture_output=True, text=True, env=e)
    bit = (r.returncode == 2) and (want_gate in r.stdout)
    return bit, r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip()


def bite_capture_missing(dst):
    snaps = list((dst / "snapshots").glob("*.html"))
    snaps[0].unlink()  # xoá một bản chụp
    return _expect_bite(dst, "CAPTURE_MISSING")


def bite_span_not_found(dst):
    cj = dst / "claims.jsonl"
    rows = [json.loads(l) for l in cj.read_text(encoding="utf-8").splitlines() if l.strip()]
    rows[0]["evidence_span"] = "ĐOẠN BỊA KHÔNG CÓ TRONG SNAPSHOT"  # LLM bịa
    cj.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    return _expect_bite(dst, "SPAN_NOT_FOUND")


def bite_sourced_attr(dst):
    cj = dst / "claims.jsonl"
    rows = [json.loads(l) for l in cj.read_text(encoding="utf-8").splitlines() if l.strip()]
    rows[0]["tier"] = "Z"  # tier không hợp lệ
    cj.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    return _expect_bite(dst, "SOURCED_ATTR")


def bite_ambiguous_merge(dst):
    dy = dst / "domain.yaml"
    import yaml
    cfg = yaml.safe_load(dy.read_text(encoding="utf-8"))
    clusters = cfg.get("ambiguous_clusters") or []
    if not clusters or len(clusters[0]) < 2:
        return None, "N/A · domain không khai cụm mơ hồ"  # không áp dụng
    cl = clusters[0]
    cfg.setdefault("alias_map", {})[cl[1]] = cl[0]  # gộp âm thầm 2 thành viên cụm mơ hồ
    dy.write_text(yaml.safe_dump(cfg, allow_unicode=True), encoding="utf-8")
    return _expect_bite(dst, "AMBIGUOUS_MERGE_UNFLAGGED")


def bite_no_denominator(dst):
    dy = dst / "domain.yaml"
    import yaml
    cfg = yaml.safe_load(dy.read_text(encoding="utf-8"))
    cfg["universe"]["estimate"] = None  # giấu mẫu số
    dy.write_text(yaml.safe_dump(cfg, allow_unicode=True), encoding="utf-8")
    return _expect_bite(dst, "DISTRIBUTION_NO_DENOMINATOR")


def bite_idempotent(dst):
    # bật hook phi-tất-định, gate idempotent phải cắn
    return _expect_bite(dst, "IDEMPOTENT", env={"REFINERY_BITE_NONDET": "1"})


def _rows(dst):
    cj = dst / "claims.jsonl"
    return cj, [json.loads(l) for l in cj.read_text(encoding="utf-8").splitlines() if l.strip()]


def bite_required_field(dst):
    """domain_gates · răng nguyện-vọng/kế-hoạch. Xoá claim field bắt buộc của một entity đúng loại →
    REQUIRED_FIELD phải cắn. N/A nếu domain không khai required_fields."""
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    req = (cfg.get("domain_gates") or {}).get("required_fields")
    if not req:
        return None, "N/A · domain không khai required_fields"
    tf = cfg["schema"].get("type_field")
    cj, rows = _rows(dst)
    etype = {r["entity"]: r["value"] for r in rows if r.get("field") == tf}
    for rtype, fields in req.items():
        rf = fields[0]
        victim = next((r["entity"] for r in rows
                       if r.get("field") == rf and etype.get(r["entity"]) == rtype), None)
        if victim:
            rows2 = [r for r in rows if not (r["entity"] == victim and r["field"] == rf)]
            cj.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows2), encoding="utf-8")
            return _expect_bite(dst, "REQUIRED_FIELD")
    return None, "N/A · không có claim field-bắt-buộc để xoá"


def bite_origin_evidence(dst):
    """domain_gates · răng dịch. Gắn origin=zh cho một claim tier-A có span ASCII (bản dịch) →
    ORIGIN_EVIDENCE phải cắn. N/A nếu domain không khai origin_evidence."""
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    g = (cfg.get("domain_gates") or {}).get("origin_evidence")
    if not g:
        return None, "N/A · domain không khai origin_evidence"
    tier = g.get("require_cjk_for_tier", "A")
    cj, rows = _rows(dst)
    for r in rows:
        if not CJK.search(r.get("evidence_span", "")):
            r["tier"] = tier; r["origin"] = "zh"   # khai nguồn-gốc Hoa-văn tier-A nhưng span không có chữ Hán = chỉ bản dịch
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "ORIGIN_EVIDENCE")
    return None, "N/A · không có claim span-ASCII để tiêm"


def bite_no_inferred(dst):
    """domain_gates · răng không-suy-diễn. Đổi một claim sang (field no-inferred, extraction=inferred) →
    NO_INFERRED phải cắn. N/A nếu domain không khai no_inferred_fields."""
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    nf = (cfg.get("domain_gates") or {}).get("no_inferred_fields")
    if not nf:
        return None, "N/A · domain không khai no_inferred_fields"
    cj, rows = _rows(dst)
    if not rows:
        return None, "N/A · không có claim để tiêm"
    rows[0]["field"] = nf[0]; rows[0]["extraction"] = "inferred"   # suy-diễn một field cấm-suy-diễn
    cj.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    return _expect_bite(dst, "NO_INFERRED")


def bite_stratum(dst):
    """STRATUM_MISMATCH · đổi một stratum claim sang tầng SAI → phải cắn. N/A nếu domain không khai
    expected_stratum (hoặc chưa có claim stratum nào)."""
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    exp = (cfg.get("expected_stratum") or "").strip()
    if not exp:
        return None, "N/A · domain không khai expected_stratum"
    cj, rows = _rows(dst)
    for r in rows:
        if r.get("field") == "stratum":
            r["value"] = "world" if exp != "world" else "china"   # tự-khai lệch khỏi tầng domain
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "STRATUM_MISMATCH")
    return None, "N/A · chưa có claim stratum để tiêm"


def bite_scope(dst):
    """SCOPE_PLACEMENT · đổi scope của một market_claim sang phạm-vi NGOÀI tầng domain → phải cắn.
    N/A nếu domain không khai allowed_scopes hoặc không có claim scope nào."""
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    allowed = (cfg.get("domain_gates") or {}).get("allowed_scopes")
    if not allowed:
        return None, "N/A · domain không khai allowed_scopes"
    bad = "vietnam" if "vietnam" not in allowed else "global" if "global" not in allowed else "zzz_invalid"
    cj, rows = _rows(dst)
    for r in rows:
        if r.get("field") == "scope":
            r["value"] = bad
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "SCOPE_PLACEMENT")
    return None, "N/A · chưa có claim scope để tiêm"


def _incidents(rows):
    return {r["entity"] for r in rows if r.get("field") == "entity_type" and r.get("value") == "incident"}


def _has_incident_gate(dst, key):
    import yaml
    cfg = yaml.safe_load((dst / "domain.yaml").read_text(encoding="utf-8"))
    return ((cfg.get("domain_gates") or {}).get("incident_evidence") or {}).get(key)


def bite_cause_sourced(dst):
    """CAUSE_SOURCED · đổi giá-trị cause sang nguyên-nhân KHÔNG có trong span → phải cắn.
    N/A nếu domain không khai cause_grounded hoặc không có incident có cause."""
    if not _has_incident_gate(dst, "cause_grounded"):
        return None, "N/A · domain không khai cause_grounded"
    cj, rows = _rows(dst)
    inc = _incidents(rows)
    for r in rows:
        if r["entity"] in inc and r.get("field") == "cause" and r.get("value"):
            r["value"] = "do lỗi thiết bị điều khiển"   # nguyên-nhân không có trong evidence_span gốc
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "CAUSE_SOURCED")
    return None, "N/A · không có incident có cause để tiêm"


def bite_severity_sourced(dst):
    """SEVERITY_SOURCED · đổi severity sang mức-độ KHÔNG bám span → phải cắn."""
    if not _has_incident_gate(dst, "severity_grounded"):
        return None, "N/A · domain không khai severity_grounded"
    cj, rows = _rows(dst)
    inc = _incidents(rows)
    for r in rows:
        if r["entity"] in inc and r.get("field") == "severity" and r.get("value"):
            r["value"] = "hàng trăm người thương vong"   # con-số không có trong nguồn
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "SEVERITY_SOURCED")
    return None, "N/A · không có incident có severity để tiêm"


def bite_no_blame_inferred(dst):
    """NO_BLAME_INFERRED · gán một câu QUY-LỖI tự-suy vào một field incident (không cause/severity) →
    phải cắn. Tiêm vào `status` để cô-lập khỏi CAUSE/SEVERITY/NO_INFERRED."""
    if not _has_incident_gate(dst, "no_blame_inferred"):
        return None, "N/A · domain không khai no_blame_inferred"
    cj, rows = _rows(dst)
    inc = _incidents(rows)
    for r in rows:
        if r["entity"] in inc and r.get("field") == "status" and r.get("value"):
            r["value"] = "sự cố do hãng sản xuất gây ra"   # quy-lỗi
            r["extraction"] = "inferred"                    # tự-suy, không nguồn quy
            cj.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows), encoding="utf-8")
            return _expect_bite(dst, "NO_BLAME_INFERRED")
    return None, "N/A · không có incident có status để tiêm"


BITES = [
    ("CAPTURE_MISSING", bite_capture_missing),
    ("SPAN_NOT_FOUND", bite_span_not_found),
    ("SOURCED_ATTR", bite_sourced_attr),
    ("AMBIGUOUS_MERGE_UNFLAGGED", bite_ambiguous_merge),
    ("DISTRIBUTION_NO_DENOMINATOR", bite_no_denominator),
    ("IDEMPOTENT", bite_idempotent),
    ("REQUIRED_FIELD", bite_required_field),
    ("ORIGIN_EVIDENCE", bite_origin_evidence),
    ("NO_INFERRED", bite_no_inferred),
    ("STRATUM_MISMATCH", bite_stratum),
    ("SCOPE_PLACEMENT", bite_scope),
    ("CAUSE_SOURCED", bite_cause_sourced),
    ("SEVERITY_SOURCED", bite_severity_sourced),
    ("NO_BLAME_INFERRED", bite_no_blame_inferred),
]


def main(domain_dir):
    # positive control: bản sạch phải PASS
    clean = subprocess.run([sys.executable, str(Path(__file__).parent / "refinery.py"), domain_dir],
                          capture_output=True, text=True)
    print(f"{'CLEAN (positive control)':32s} : ", "PASS exit0" if clean.returncode == 0 else f"!! exit{clean.returncode}")
    print("-" * 60)
    all_ok = clean.returncode == 0
    for name, fn in BITES:
        tmp, dst = _copy(domain_dir)
        try:
            bit, last = fn(dst)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        if bit is None:
            print(f"{name:32s} :  N/A ({last})")
            continue
        all_ok = all_ok and bit
        print(f"{name:32s} : ", "CẮN ✓ (build dừng)" if bit else f"KHÔNG CẮN ✗  [{last}]")
    print("-" * 60)
    print("BITE SUITE:", "TẤT CẢ RĂNG CẮN ✓" if all_ok else "CÓ RĂNG KHÔNG CẮN ✗")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "domains/durian"))
