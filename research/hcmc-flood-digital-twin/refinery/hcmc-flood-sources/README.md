# Refinery domain — HCMC flood sources

Nguồn được chụp bằng `capture_sources.py`; raw response và text snapshot chuẩn hóa (`*.html` để tương thích bite harness) được khóa bằng SHA-256 trong `capture-manifest.json`. Mỗi claim trong `claims.jsonl` phải chứa `evidence_span` nguyên văn nằm trong snapshot.

Chạy:

```sh
python3 capture_sources.py
python3 ../../../../outputs/hcmc-poc/research/refinery.py .
python3 /Users/os/.codex/skills/refinery/bites.py .
python3 export_registry.py
python3 ../../build_scenario_catalog.py
```

`registry.json` được sinh bởi `export_registry.py`. Không công bố giá trị disputed và không điền các ô honest-null.
