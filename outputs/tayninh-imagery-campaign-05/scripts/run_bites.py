#!/usr/bin/env python3
import argparse
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT_DEFAULT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT_DEFAULT / 'scripts' / 'validate_inventory.py'


def run_validator(root: Path, inventory: Path):
    proc = subprocess.run(
        [sys.executable, str(VALIDATOR), '--root', str(root), '--inventory', str(inventory)],
        text=True,
        capture_output=True,
        check=False,
    )
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError:
        payload = {'ok': False, 'stdout': proc.stdout, 'stderr': proc.stderr}
    return proc.returncode, payload


def write_case(tmp: Path, name: str, data):
    p = tmp / f'{name}.json'
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True))
    return p


def first_hashed_evidence(data):
    for r_i, record in enumerate(data['records']):
        for e_i, evidence in enumerate(record.get('evidence') or []):
            if evidence.get('sha256') and evidence.get('path'):
                return r_i, e_i
    raise RuntimeError('No hashed evidence in inventory')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=str(ROOT_DEFAULT))
    ap.add_argument('--inventory', default='registry/inventory.json')
    args = ap.parse_args()
    root = Path(args.root).resolve()
    inventory = Path(args.inventory)
    if not inventory.is_absolute():
        inventory = root / inventory
    base = json.loads(inventory.read_text())
    results = []

    with tempfile.TemporaryDirectory(prefix='c05-bites-') as d:
        tmp = Path(d)

        rc, payload = run_validator(root, inventory)
        results.append({'case': 'valid_inventory', 'expected': 'pass', 'passed': rc == 0 and payload.get('ok') is True, 'codes': [e.get('code') for e in payload.get('errors', [])]})

        duplicate = copy.deepcopy(base)
        duplicate['records'][1]['id'] = duplicate['records'][0]['id']
        p = write_case(tmp, 'duplicate-id', duplicate)
        rc, payload = run_validator(root, p)
        results.append({'case': 'duplicate_id', 'expected': 'fail:DUPLICATE_ID', 'passed': rc != 0 and any(e.get('code') == 'DUPLICATE_ID' for e in payload.get('errors', [])), 'codes': [e.get('code') for e in payload.get('errors', [])]})

        corrupted = copy.deepcopy(base)
        r_i, e_i = first_hashed_evidence(corrupted)
        corrupted['records'][r_i]['evidence'][e_i]['sha256'] = '0' * 64
        p = write_case(tmp, 'corrupted-hash', corrupted)
        rc, payload = run_validator(root, p)
        results.append({'case': 'corrupted_hash', 'expected': 'fail:EVIDENCE_HASH_MISMATCH', 'passed': rc != 0 and any(e.get('code') == 'EVIDENCE_HASH_MISMATCH' for e in payload.get('errors', [])), 'codes': [e.get('code') for e in payload.get('errors', [])]})

        missing = copy.deepcopy(base)
        missing['records'][0]['evidence'][0]['path'] = 'evidence/baseline/does-not-exist.json'
        p = write_case(tmp, 'missing-file', missing)
        rc, payload = run_validator(root, p)
        results.append({'case': 'missing_file', 'expected': 'fail:EVIDENCE_FILE_MISSING', 'passed': rc != 0 and any(e.get('code') == 'EVIDENCE_FILE_MISSING' for e in payload.get('errors', [])), 'codes': [e.get('code') for e in payload.get('errors', [])]})

    ok = all(item['passed'] for item in results)
    print(json.dumps({'ok': ok, 'results': results}, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
