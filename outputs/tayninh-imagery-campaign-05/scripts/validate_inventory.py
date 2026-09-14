#!/usr/bin/env python3
import argparse
import hashlib
import json
import sys
from pathlib import Path

MARKER = 'outputs/tayninh-imagery-campaign-05/'


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def resolve_path(root: Path, value: str) -> Path:
    if not value:
        raise ValueError('EMPTY_PATH')
    s = str(value)
    if MARKER in s:
        s = s.split(MARKER, 1)[1]
        return (root / s).resolve()
    p = Path(s)
    if p.is_absolute():
        return p
    if s.startswith('outputs/'):
        workspace = root.parent.parent
        return (workspace / p).resolve()
    return (root / p).resolve()


def add_error(errors, code, **kw):
    item = {'code': code}
    item.update(kw)
    errors.append(item)


def validate(root: Path, inventory_path: Path):
    errors = []
    inv = json.loads(inventory_path.read_text())
    records = inv.get('records')
    if not isinstance(records, list):
        add_error(errors, 'RECORDS_NOT_ARRAY')
        records = []

    ids = {}
    evidence_count = 0
    checked_hashes = 0

    for idx, record in enumerate(records):
        rid = record.get('id') or f'index:{idx}'
        if rid in ids:
            add_error(errors, 'DUPLICATE_ID', id=rid, first_index=ids[rid], second_index=idx)
        ids[rid] = idx
        evidence = record.get('evidence') or []
        if not isinstance(evidence, list):
            add_error(errors, 'EVIDENCE_NOT_ARRAY', id=rid)
            continue
        if not evidence:
            add_error(errors, 'EVIDENCE_MISSING', id=rid)
        for eidx, item in enumerate(evidence):
            evidence_count += 1
            path_value = item.get('path')
            if not path_value:
                add_error(errors, 'EVIDENCE_PATH_MISSING', id=rid, evidence_index=eidx)
                continue
            path = resolve_path(root, path_value)
            if not path.exists() or not path.is_file():
                add_error(errors, 'EVIDENCE_FILE_MISSING', id=rid, path=path_value)
                continue
            expected = item.get('sha256')
            if expected:
                checked_hashes += 1
                actual = sha256_file(path)
                if actual != expected:
                    add_error(errors, 'EVIDENCE_HASH_MISMATCH', id=rid, path=path_value, expected=expected, actual=actual)

    source_files = ((inv.get('summary') or {}).get('source_files') or [])
    for item in source_files:
        path_value = item.get('path')
        if not path_value:
            add_error(errors, 'SOURCE_PATH_MISSING')
            continue
        path = resolve_path(root, path_value)
        if not path.exists() or not path.is_file():
            add_error(errors, 'SOURCE_FILE_MISSING', path=path_value)
            continue
        expected = item.get('sha256')
        if expected:
            checked_hashes += 1
            actual = sha256_file(path)
            if actual != expected:
                add_error(errors, 'SOURCE_HASH_MISMATCH', path=path_value, expected=expected, actual=actual)

    summary = {
        'ok': not errors,
        'inventory': str(inventory_path),
        'records': len(records),
        'unique_ids': len(ids),
        'evidence_count': evidence_count,
        'checked_hashes': checked_hashes,
        'errors': errors,
    }
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument('--inventory', default='registry/inventory.json')
    args = ap.parse_args()
    root = Path(args.root).resolve()
    inventory_path = Path(args.inventory)
    if not inventory_path.is_absolute():
        inventory_path = root / inventory_path
    result = validate(root, inventory_path.resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
