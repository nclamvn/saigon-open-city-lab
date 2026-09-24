#!/usr/bin/env python3
"""Remove only allow-listed, reproducible workspace residue.

Dry-run is the default. Pass --apply to delete candidates. Tracked files are
always protected, including files nested below an allow-listed directory.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPLICIT_PATHS = (
    ROOT / "work/archive-ui-pre-demo",
    ROOT / "work/v1-backup",
    ROOT / "work/RGBELoader.js",
    ROOT / "work/bitexco-model.html",
)


def tracked_paths() -> set[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, check=True, capture_output=True
    )
    return {
        item.decode("utf-8", errors="surrogateescape")
        for item in result.stdout.split(b"\0")
        if item
    }


def candidates() -> list[Path]:
    found = {path for path in EXPLICIT_PATHS if path.exists() or path.is_symlink()}
    for directory in ROOT.rglob("__pycache__"):
        if ".git" not in directory.parts:
            found.add(directory)
    for pattern in (".DS_Store", "._*", "*.pyc", "*.pyo"):
        found.update(path for path in ROOT.rglob(pattern) if ".git" not in path.parts)
    raw_ranges = ROOT / "outputs/hcmc-poc/data/surface-18/quarantine/raw-ranges"
    if raw_ranges.exists():
        found.update(raw_ranges.rglob("*.bin"))
    tile_root = ROOT / "outputs/hcmc-poc/data/tiles-18"
    if tile_root.exists():
        found.update(tile_root.rglob("* 2.glb"))
        found.update(tile_root.rglob("* 2.json"))

    ordered = sorted(found, key=lambda path: (len(path.parts), str(path)))
    roots: list[Path] = []
    for path in ordered:
        if not any(parent == path or parent in path.parents for parent in roots):
            roots.append(path)
    return roots


def protected(path: Path, tracked: set[str]) -> bool:
    relative = path.relative_to(ROOT).as_posix()
    prefix = relative.rstrip("/") + "/"
    return relative in tracked or any(item.startswith(prefix) for item in tracked)


def byte_size(path: Path) -> int:
    if path.is_symlink() or path.is_file():
        return path.lstat().st_size
    return sum(item.lstat().st_size for item in path.rglob("*") if item.is_file())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="delete the allow-listed residue")
    args = parser.parse_args()
    tracked = tracked_paths()
    removable: list[tuple[Path, int]] = []
    for path in candidates():
        if protected(path, tracked):
            raise SystemExit(f"refusing to remove tracked path: {path.relative_to(ROOT)}")
        removable.append((path, byte_size(path)))

    for path, size in removable:
        print(f"{'REMOVE' if args.apply else 'WOULD_REMOVE'}\t{size}\t{path.relative_to(ROOT)}")
    print(f"candidates={len(removable)} bytes={sum(size for _, size in removable)} apply={args.apply}")

    if args.apply:
        for path, _ in removable:
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
