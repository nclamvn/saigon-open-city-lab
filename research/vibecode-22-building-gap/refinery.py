#!/usr/bin/env python3
"""refinery.py · Engine thực thi chuẩn cho tinh lọc dữ liệu cào.

Domain-agnostic. Một domain = một thư mục chứa:
  domain.yaml      · schema, tier, refresh, universe, alias_map, ambiguous_clusters
  claims.jsonl     · các claim đã trích + đóng băng (mỗi dòng một claim)
  snapshots/       · bản chụp raw của nguồn (để kiểm evidence_span)

Engine chạy 7 giai đoạn của thủ tục, mỗi gate fail-loud (raise GateError → exit 2).
Build tất định (idempotent). Auditor re-derive độc lập với builder.

Hợp đồng claim (một dòng claims.jsonl):
  {
    "entity": "<tên thực thể như nguồn ghi>",
    "field":  "<một field trong schema>",
    "value":  <giá trị>,
    "evidence_span": "<đoạn text gốc verbatim, phải nằm trong snapshot>",
    "extraction": "verbatim|normalized|inferred",
    "tier": "A|B|C",
    "capture": {"url": "...", "fetched_at": "...Z", "snapshot": "<file>", "source": "<domain nguồn>"}
  }
"""
import os, sys, json, hashlib, datetime, re, html, unicodedata
from pathlib import Path


def _norm(s):
    """TIP-NEWS-REALTIME Task 1 — normalize-trong-matcher: snapshot lưu RAW đúng byte nguồn; chuẩn-hoá
    (giải HTML-entity + Unicode NFC) CẢ snapshot lẫn evidence_span NGAY TRƯỚC khi so khớp. Nguồn
    entity-encoded ('c&oacute;'='có') hết false-fail mà KHÔNG đụng evidence gốc. SPAN_NOT_FOUND vẫn cắn
    khi span thật vắng (chuẩn-hoá không thêm nội-dung, chỉ hợp-nhất biểu-diễn cùng ký-tự)."""
    return unicodedata.normalize("NFC", html.unescape(s or ""))

try:
    import yaml
except ImportError:
    sys.exit("Cần PyYAML: pip install pyyaml")

NULL = "—"
VALID_TIERS = {"A", "B", "C"}
VALID_EXTRACTION = {"verbatim", "normalized", "inferred"}


class GateError(Exception):
    """Một cổng kiểm cắn. Build phải dừng (exit 2)."""
    def __init__(self, gate, msg):
        super().__init__(f"[{gate}] {msg}")
        self.gate = gate


# ───────────────────────── load ─────────────────────────

def load_domain(domain_dir):
    domain_dir = Path(domain_dir)
    cfg = yaml.safe_load((domain_dir / "domain.yaml").read_text(encoding="utf-8"))
    claims = []
    for i, line in enumerate((domain_dir / "claims.jsonl").read_text(encoding="utf-8").splitlines()):
        line = line.strip()
        if line:
            claims.append(json.loads(line))
    cfg["_dir"] = str(domain_dir)
    return cfg, claims


def _snapshot_text(domain_dir, name):
    p = Path(domain_dir) / "snapshots" / name
    if not p.exists():
        return None
    return p.read_text(encoding="utf-8", errors="replace")


# ───────────────────── Stage 1-2: gates per claim ─────────────────────

def gate_claims(cfg, claims):
    """Giai đoạn 1 (Capture) + 2 (Extract): mỗi claim phải qua cổng trước khi vào registry."""
    domain_dir = cfg["_dir"]
    fields = set(cfg["schema"]["fields"])
    nsnap_cache = {}                                  # snapshot-name → normalized text (chuẩn-hoá 1 lần/snapshot)
    for n, c in enumerate(claims):
        tag = f"claim#{n} entity={c.get('entity','?')!r} field={c.get('field','?')!r}"
        # SOURCED_ATTR: phải có capture + tier hợp lệ + field hợp lệ
        if c.get("field") not in fields:
            raise GateError("SOURCED_ATTR", f"{tag}: field ngoài schema")
        cap = c.get("capture") or {}
        if not cap.get("snapshot") or not cap.get("source"):
            raise GateError("SOURCED_ATTR", f"{tag}: thiếu capture.snapshot/source")
        if c.get("tier") not in VALID_TIERS:
            raise GateError("SOURCED_ATTR", f"{tag}: tier không hợp lệ {c.get('tier')!r}")
        if c.get("extraction") not in VALID_EXTRACTION:
            raise GateError("SOURCED_ATTR", f"{tag}: extraction không hợp lệ")
        # CAPTURE_MISSING: bản chụp raw phải tồn tại
        snap = _snapshot_text(domain_dir, cap["snapshot"])
        if snap is None:
            raise GateError("CAPTURE_MISSING", f"{tag}: snapshot {cap['snapshot']!r} không tồn tại")
        # SPAN_NOT_FOUND: đoạn verbatim phải nằm trong bản chụp — so khớp SAU chuẩn-hoá (normalize-in-matcher)
        if cap["snapshot"] not in nsnap_cache:
            nsnap_cache[cap["snapshot"]] = _norm(snap)
        span = c.get("evidence_span", "")
        if not span or _norm(span) not in nsnap_cache[cap["snapshot"]]:
            raise GateError("SPAN_NOT_FOUND", f"{tag}: evidence_span không thấy verbatim trong snapshot")
    return claims


# ───────────────────── Stage 4: canonical entity ─────────────────────

def canonicalize(cfg, name):
    alias = cfg.get("alias_map") or {}
    return alias.get(name, name)


def check_ambiguous(cfg):
    """AMBIGUOUS_MERGE_UNFLAGGED: alias_map không được gộp 2 thành viên của cụm mơ hồ."""
    alias = cfg.get("alias_map") or {}
    clusters = cfg.get("ambiguous_clusters") or []
    members = {m for cl in clusters for m in cl}
    for src, dst in alias.items():
        if src in members and dst in members and src != dst:
            raise GateError("AMBIGUOUS_MERGE_UNFLAGGED",
                            f"alias_map gộp âm thầm cụm mơ hồ: {src!r} → {dst!r} (phải flag cho người)")


# ─────────── domain_gates: cổng khai-báo, domain-agnostic (config mở-rộng, KHÔNG hard-code domain) ───────────
# Engine không declare `domain_gates` → các cổng dưới đây no-op (tương thích ngược durian/uav_makers).

CJK = re.compile(r"[㐀-鿿豈-﫿]")   # chữ Hán/Hoa-văn


def gate_origin_evidence(cfg, claims):
    """ORIGIN_EVIDENCE — răng dịch. Một claim gắn `origin: zh` ở tier cấu-hình PHẢI mang đoạn gốc
    (Hoa-văn) làm evidence_span; nếu span chỉ là bản dịch (không có chữ Hán), giá-trị đã qua một lớp
    dịch và không được đứng tên nguồn-gốc tier đó. Chỉ chạy nếu domain khai origin_evidence."""
    g = (cfg.get("domain_gates") or {}).get("origin_evidence")
    if not g:
        return
    tier = g.get("require_cjk_for_tier", "A")
    for n, c in enumerate(claims):
        if c.get("origin") == "zh" and c.get("tier") == tier and not CJK.search(c.get("evidence_span", "")):
            raise GateError("ORIGIN_EVIDENCE",
                f"claim#{n} entity={c.get('entity')!r}: origin=zh tier={tier} nhưng evidence_span không có chữ gốc (Hoa-văn) — chỉ là bản dịch")


def gate_no_inferred(cfg, claims):
    """NO_INFERRED — răng không-suy-diễn. Các field quá dễ bịa (số đã bán / số đang hoạt động / quy mô
    đội bay; nguyên-nhân sự-cố) KHÔNG bao giờ được extraction=inferred — chỉ verbatim/normalized từ nguồn.
    Bao cả răng 'không suy diễn số vận hành' và 'phân tách nguyên nhân'. Chỉ chạy nếu domain khai."""
    fields = set((cfg.get("domain_gates") or {}).get("no_inferred_fields") or [])
    if not fields:
        return
    for n, c in enumerate(claims):
        if c.get("field") in fields and c.get("extraction") == "inferred":
            raise GateError("NO_INFERRED",
                f"claim#{n} field={c.get('field')!r}: giá-trị này không được suy-diễn (inferred) — chỉ verbatim/normalized từ nguồn công-bố")


# REF5 — răng đặc-thù INCIDENT. Loại dữ-liệu vừa giá-trị nhất vừa hại nhất nếu ẩu: ghi sai nguyên-nhân
# = vu-khống một hãng; thổi mức-độ = gieo sợ sai. Nên cause/severity/quy-lỗi PHẢI bám đúng đoạn nguồn.
_BLAME_RE = re.compile(r"(lỗi của|do .{1,28}? gây|trách nhiệm (của|thuộc)|vì .{1,18}? (sai|tắc trách)|đổ lỗi|"
                       r"caused by|fault of|at fault|to blame|blamed|responsible for|attributed to|"
                       r"negligence|(pilot|operator|human) error)", re.IGNORECASE)


def _tok(s):
    return set(re.findall(r"[0-9a-zà-ỹ]{3,}", (s or "").lower()))


def _grounded(value, span):
    """Nội-dung của value PHẢI hiện trong đoạn nguồn (span) — nguồn thật-sự nêu điều này, không tự-suy."""
    vt = _tok(value)
    if not vt:
        return True
    return len(vt & _tok(span)) >= 1


def gate_incident_evidence(cfg, claims):
    """REF5 ba răng: CAUSE_SOURCED (nguyên-nhân phải bám đoạn nguồn) · SEVERITY_SOURCED (mức-độ phải bám
    nguồn) · NO_BLAME_INFERRED (mọi câu quy-lỗi phải có nguồn quy, cấm tự-suy). Chỉ chạy nếu domain khai
    incident_evidence. Một incident sai làm hại người thật — đây là lằn ranh giữ desk này khỏi thành vũ-khí."""
    g = (cfg.get("domain_gates") or {}).get("incident_evidence")
    if not g:
        return
    incidents = {c["entity"] for c in claims
                 if c.get("field") == "entity_type" and c.get("value") == "incident"}
    for n, c in enumerate(claims):
        if c.get("entity") not in incidents:
            continue
        f, v, span = c.get("field"), c.get("value"), c.get("evidence_span", "")
        if v in (None, ""):
            continue
        if g.get("cause_grounded") and f == "cause" and not (span and _grounded(v, span)):
            raise GateError("CAUSE_SOURCED",
                f"incident {c['entity']!r}: nguyên-nhân {v!r} KHÔNG có trong evidence_span — nguồn không nêu nguyên-nhân này, để honest-null thay vì tự-suy")
        if g.get("severity_grounded") and f == "severity" and not (span and _grounded(v, span)):
            raise GateError("SEVERITY_SOURCED",
                f"incident {c['entity']!r}: mức-độ {v!r} KHÔNG bám evidence_span — severity/thương-vong chỉ theo con-số nguồn")
        if g.get("no_blame_inferred") and _BLAME_RE.search(str(v)):
            if c.get("extraction") == "inferred" or not (span and _grounded(v, span)):
                raise GateError("NO_BLAME_INFERRED",
                    f"incident {c['entity']!r} field={f!r}: quy-lỗi {str(v)[:40]!r} không có nguồn quy — cấm tự gán lỗi cho một bên")


def gate_stratum(cfg, registry):
    """STRATUM_MISMATCH — field `stratum` (bản tự-khai trong record) PHẢI khớp expected_stratum của domain
    (= cấu-trúc lưu-trữ). Khoá field tay vào tên-domain: record trong lae-vn không được khai stratum khác
    'vietnam'. Mẫu-số vẫn tách bằng cấu-trúc (engine không cộng chéo domain); stratum chỉ là bản-sao tự-khai
    bị kiểm liên-tục cho khớp → record portable mà không nói dối về tầng. Chỉ chạy nếu domain khai."""
    exp = (cfg.get("expected_stratum") or "").strip()
    if not exp:
        return
    for ent, rec in sorted(registry.items()):
        cell = rec["fields"].get("stratum", {"state": "null", "value": None})
        if cell["state"] == "disputed":
            raise GateError("STRATUM_MISMATCH", f"entity={ent!r}: stratum tranh-chấp (phải đơn-trị == {exp!r})")
        if cell.get("value") != exp:
            raise GateError("STRATUM_MISMATCH",
                f"entity={ent!r}: stratum={cell.get('value')!r} ≠ expected {exp!r} (tự-khai lệch khỏi tầng của domain)")


def gate_scope(cfg, registry):
    """SCOPE_PLACEMENT — PHẠM-VI của con-số (market_claim.scope) phải thuộc tầng của domain: lae-vn chỉ
    nhận scope=vietnam, lae-cn=china, lae-world∈{global, world_ex_china, regional, national_other, city}.
    Đây là KHE mà mắt-người tìm ra (REF3): STRATUM_MISMATCH khoá record↔domain, gate này khoá CON-SỐ↔PHẠM-VI
    — một record nguồn-VN vẫn có thể mang con số phạm-vi-toàn-cầu. Chỉ chạy nếu domain khai allowed_scopes."""
    allowed = set((cfg.get("domain_gates") or {}).get("allowed_scopes") or [])
    if not allowed:
        return
    for ent, rec in sorted(registry.items()):
        if rec.get("entity_type") != "market_claim":
            continue
        cell = rec["fields"].get("scope", {"state": "null", "value": None})
        if cell.get("value") not in allowed:
            raise GateError("SCOPE_PLACEMENT",
                f"entity={ent!r}: market_claim scope={cell.get('value')!r} không thuộc tầng domain (cho phép {sorted(allowed)})")


def gate_required_fields(cfg, registry):
    """REQUIRED_FIELD — răng nguyện-vọng/kế-hoạch. Với entity_type cấu-hình, các field liệt-kê PHẢI có
    (non-null). Buộc market_claim/infrastructure luôn khai `status` (mục-tiêu vs hiện-trạng · kế-hoạch
    vs vận-hành), nên một nguyện-vọng không bao giờ lặng-lẽ thành sự-thật. Chỉ chạy nếu domain khai."""
    req = (cfg.get("domain_gates") or {}).get("required_fields")
    if not req:
        return
    for ent, rec in sorted(registry.items()):
        et = rec.get("entity_type")
        for f in req.get(et, []):
            if rec["fields"].get(f, {"state": "null"})["state"] == "null":
                raise GateError("REQUIRED_FIELD",
                    f"entity={ent!r} (type={et}): thiếu field bắt buộc {f!r} (phải khai để tách mục-tiêu/kế-hoạch khỏi hiện-trạng)")


# ───────────────────── Stage 3+5: reconcile + build ─────────────────────

def build(cfg, claims):
    """Hợp nhất một nguồn sự thật + giải mâu thuẫn. Tất định."""
    check_ambiguous(cfg)
    fields = cfg["schema"]["fields"]
    # group: entity -> field -> list[claim]
    reg = {}
    for c in claims:
        ent = canonicalize(cfg, c["entity"])
        reg.setdefault(ent, {})
        reg[ent].setdefault(c["field"], []).append(c)

    out = {}
    for ent in sorted(reg):
        cell_by_field = {}
        for f in fields:
            cs = reg[ent].get(f, [])
            if not cs:
                cell_by_field[f] = {"state": "null", "value": None}
                continue
            values = {str(c["value"]) for c in cs}
            srcs = {(c["capture"]["source"], c["tier"]) for c in cs}
            claim_view = sorted(
                ({"value": c["value"], "tier": c["tier"],
                  "source": c["capture"]["source"], "extraction": c["extraction"]}
                 for c in cs),
                key=lambda d: (str(d["value"]), d["tier"], d["source"]))
            if len(values) > 1:
                cell_by_field[f] = {"state": "disputed", "value": None, "claims": claim_view}
            else:
                v = cs[0]["value"]
                indep_strong = {s for (s, t) in srcs if t in ("A", "B")}
                state = "corroborated" if len(indep_strong) >= 2 else "sourced"
                cell_by_field[f] = {"state": state, "value": v, "claims": claim_view}
        out[ent] = {
            "entity_type": _entity_type(cfg, ent, reg[ent]),
            "fields": cell_by_field,
        }
    return out


def _entity_type(cfg, ent, fieldmap):
    et_field = cfg["schema"].get("type_field")
    if et_field and et_field in fieldmap:
        # sort để không phụ thuộc thứ tự dòng claims (tất định, audit D1)
        return sorted(fieldmap[et_field], key=lambda c: str(c["value"]))[0]["value"]
    return None


# ───────────────────── Stage 5: aggregates (tính sống) ─────────────────────

def aggregates(cfg, registry):
    universe = (cfg.get("universe") or {}).get("estimate")
    n = len(registry)
    by_state = {}
    group_field = cfg.get("rollup_field")
    rollup = {}
    for ent, rec in registry.items():
        for f, cell in rec["fields"].items():
            by_state[cell["state"]] = by_state.get(cell["state"], 0) + 1
        if group_field:
            cell = rec["fields"].get(group_field, {"state": "null", "value": None})
            key = cell["value"] if cell["state"] in ("sourced", "corroborated") else (
                "tranh chấp" if cell["state"] == "disputed" else "Chưa rõ")
            rollup[str(key)] = rollup.get(str(key), 0) + 1
    return {
        "n_entities": n,
        "universe_estimate": universe,
        "coverage_pct": (round(100 * n / universe, 1) if universe else None),
        "cells_by_state": dict(sorted(by_state.items())),
        "rollup_field": group_field,
        "rollup": dict(sorted(rollup.items())),
    }


# ───────────────────── Stage 6: present (honest-null + denominator) ─────────────────────

def present_distribution(cfg, agg):
    """DISTRIBUTION_NO_DENOMINATOR: công bố phân bố phải kèm mẫu số."""
    if agg.get("rollup"):
        if not agg.get("universe_estimate"):
            raise GateError("DISTRIBUTION_NO_DENOMINATOR",
                            "công bố rollup nhưng universe.estimate trống (thiếu mẫu số)")
    lines = []
    for k, v in agg["rollup"].items():
        lines.append(f"    {k}: {v}")
    denom = f"n={agg['n_entities']} / universe≈{agg['universe_estimate']} · coverage {agg['coverage_pct']}%"
    return denom, lines


def render_cell(cell):
    if cell["state"] == "null":
        return NULL
    if cell["state"] == "disputed":
        parts = [f"{c['value']} [{c['tier']}·{c['source']}]" for c in cell["claims"]]
        return "DISPUTED{ " + " | ".join(parts) + " }"
    badge = "✓✓" if cell["state"] == "corroborated" else "✓"
    tiers = "/".join(sorted({c["tier"] for c in cell["claims"]}))
    return f"{cell['value']} [{badge}{tiers}]"


# ───────────────────── deterministic serialization + idempotent ─────────────────────

def canonical_bytes(registry, agg):
    payload = {"registry": registry, "aggregates": agg}
    # Hook CHỈ dùng cho bite: tiêm phi-tất-định để chứng minh gate idempotent biết cắn.
    if os.environ.get("REFINERY_BITE_NONDET"):
        payload["_nondet"] = os.urandom(4).hex()
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")


def digest(b):
    return hashlib.sha256(b).hexdigest()[:16]


# ───────────────────── Stage 6: independent auditor ─────────────────────

def audit(cfg, claims, registry, agg):
    """Auditor re-derive vũ trụ sự thật THẲNG TỪ CLAIMS, độc lập builder, rồi đối chiếu."""
    problems = []
    # 1. Re-derive entity set từ claims (không đọc registry)
    ents_from_claims = {canonicalize(cfg, c["entity"]) for c in claims}
    ents_in_reg = set(registry.keys())
    if ents_from_claims != ents_in_reg:
        problems.append(f"entity set lệch: claims={len(ents_from_claims)} registry={len(ents_in_reg)}")
    # 2. Không entity mồ côi: mỗi entity trong registry phải có >=1 claim có capture+span
    for ent in registry:
        if not any(canonicalize(cfg, c["entity"]) == ent for c in claims):
            problems.append(f"entity mồ côi (không claim nào trỏ về): {ent!r}")
    # 3. Aggregate re-compute độc lập, so với build
    agg2 = aggregates(cfg, build(cfg, claims))
    if agg2 != agg:
        problems.append("aggregate re-derive lệch với build (OVERVIEW_DRIFT)")
    if problems:
        raise GateError("AUDIT", "auditor bắt lệch: " + " ; ".join(problems))
    return True


# ───────────────────── orchestrator ─────────────────────

def run_pipeline(domain_dir):
    cfg, claims = load_domain(domain_dir)
    gate_claims(cfg, claims)               # Stage 1-2
    gate_origin_evidence(cfg, claims)      # Stage 2 (domain_gates · răng dịch)
    gate_no_inferred(cfg, claims)          # Stage 2 (domain_gates · răng không-suy-diễn vận-hành/nguyên-nhân)
    gate_incident_evidence(cfg, claims)    # Stage 2 (REF5 · CAUSE/SEVERITY_SOURCED + NO_BLAME_INFERRED)
    registry = build(cfg, claims)          # Stage 3-5
    gate_required_fields(cfg, registry)    # Stage 5 (domain_gates · răng nguyện-vọng/kế-hoạch)
    gate_stratum(cfg, registry)            # Stage 5 (STRATUM_MISMATCH · field tự-khai khoá vào cấu-trúc)
    gate_scope(cfg, registry)              # Stage 5 (SCOPE_PLACEMENT · phạm-vi con-số khoá vào tầng)
    agg = aggregates(cfg, registry)        # Stage 5
    present_distribution(cfg, agg)         # Stage 6 gate
    audit(cfg, claims, registry, agg)      # Stage 6 auditor
    # idempotent: build lần 2, so byte
    b1 = canonical_bytes(registry, agg)
    registry2 = build(cfg, claims)
    agg2 = aggregates(cfg, registry2)
    b2 = canonical_bytes(registry2, agg2)
    if b1 != b2:
        raise GateError("IDEMPOTENT", "build hai lần ra byte khác nhau")
    return cfg, claims, registry, agg, b1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: refinery.py <domain_dir>")
    try:
        cfg, claims, registry, agg, b = run_pipeline(sys.argv[1])
    except GateError as e:
        print(f"GATE BITES · build dừng · {e}")
        sys.exit(2)
    print("═" * 64)
    print(f"REFINERY · domain={cfg['domain']} · {cfg.get('entity_label','')}")
    print("═" * 64)
    for ent in sorted(registry):
        print(f"\n▸ {ent}  ({registry[ent]['entity_type'] or '—'})")
        for f, cell in registry[ent]["fields"].items():
            print(f"    {f:16s}: {render_cell(cell)}")
    denom, lines = present_distribution(cfg, agg)
    print(f"\nPhân bố theo {agg['rollup_field']} ({denom}):")
    for ln in lines:
        print(ln)
    print(f"\nbuild digest = {digest(b)}  · idempotent OK · auditor OK")
    print("VALIDATION PASSED · 0 gate bites")
