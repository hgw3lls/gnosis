#!/usr/bin/env python3
"""
resolve_keep_ours.py

Recursively resolves Git conflict markers by keeping the "ours" side:
... ours ...

It removes conflict markers and discards the "theirs" section.

Usage:
  python resolve_keep_ours.py . --dry-run
  python resolve_keep_ours.py path/to/folder
  python resolve_keep_ours.py . --no-backup
"""

from __future__ import annotations
import argparse
import os
from pathlib import Path
from typing import List, Tuple


CONFLICT_START = "<<<<<<<"
CONFLICT_MID = "======="
CONFLICT_END = ">>>>>>>"

# Common folders to skip
DEFAULT_EXCLUDES = {".git", "node_modules", "dist", "build", ".next", ".venv", "venv", "__pycache__"}


def is_probably_binary(data: bytes) -> bool:
    # Heuristic: if it has NUL byte, treat as binary.
    return b"\x00" in data


def resolve_conflicts_keep_ours(lines: List[str]) -> Tuple[List[str], int]:
    """
    Returns (new_lines, num_conflict_blocks_resolved).

    Keeps content between <<<<<<< and =======.
    Drops content between ======= and >>>>>>>.
    Removes marker lines.
    """
    out: List[str] = []
    i = 0
    resolved = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        if line.startswith(CONFLICT_START):
            # Enter conflict block
            i += 1
            ours: List[str] = []
            theirs: List[str] = []

            # Collect ours until mid
            while i < n and not lines[i].startswith(CONFLICT_MID):
                # If we hit another start unexpectedly, bail out by preserving original
                if lines[i].startswith(CONFLICT_START):
                    raise ValueError("Nested conflict start found before ======= (unexpected).")
                ours.append(lines[i])
                i += 1

            if i >= n or not lines[i].startswith(CONFLICT_MID):
                raise ValueError("Conflict block missing ======= separator.")

            # Skip mid line
            i += 1

            # Collect theirs until end
            while i < n and not lines[i].startswith(CONFLICT_END):
                # If we hit another start unexpectedly, bail out
                if lines[i].startswith(CONFLICT_START):
                    raise ValueError("Nested conflict start found inside THEIRS section (unexpected).")
                theirs.append(lines[i])
                i += 1

            if i >= n or not lines[i].startswith(CONFLICT_END):
                raise ValueError("Conflict block missing >>>>>>> end marker.")

            # Skip end line
            i += 1

            # Keep ours, drop theirs
            out.extend(ours)
            resolved += 1
        else:
            out.append(line)
            i += 1

    return out, resolved


def should_skip_path(path: Path, excludes: set[str]) -> bool:
    parts = set(path.parts)
    return any(ex in parts for ex in excludes)


def process_file(path: Path, dry_run: bool, backup: bool) -> Tuple[bool, int, str]:
    """
    Returns (changed, resolved_blocks, message)
    """
    try:
        data = path.read_bytes()
    except Exception as e:
        return (False, 0, f"READ_FAIL: {e}")

    if is_probably_binary(data):
        return (False, 0, "SKIP_BINARY")

    try:
        text = data.decode("utf-8")
        encoding = "utf-8"
    except UnicodeDecodeError:
        # Try a more permissive decode. If this still fails, skip.
        try:
            text = data.decode("utf-8", errors="replace")
            encoding = "utf-8 (replace)"
        except Exception as e:
            return (False, 0, f"DECODE_FAIL: {e}")

    if CONFLICT_START not in text:
        return (False, 0, "NO_CONFLICT_MARKERS")

    lines = text.splitlines(keepends=True)

    try:
        new_lines, resolved = resolve_conflicts_keep_ours(lines)
    except ValueError as e:
        return (False, 0, f"PARSE_FAIL: {e}")

    if resolved == 0:
        return (False, 0, "NO_CONFLICT_BLOCKS_FOUND")

    new_text = "".join(new_lines)

    # If changed, write out
    if not dry_run:
        if backup:
            bak_path = path.with_suffix(path.suffix + ".bak")
            # Don’t overwrite an existing backup; make a numbered one if needed
            if bak_path.exists():
                k = 1
                while True:
                    candidate = path.with_suffix(path.suffix + f".bak{k}")
                    if not candidate.exists():
                        bak_path = candidate
                        break
                    k += 1
            bak_path.write_bytes(data)

        path.write_text(new_text, encoding="utf-8")

    return (True, resolved, f"RESOLVED:{resolved} ({encoding})")


def main():
    ap = argparse.ArgumentParser(description="Resolve git conflict markers by keeping OURS side.")
    ap.add_argument("root", nargs="?", default=".", help="Root folder to scan (default: .)")
    ap.add_argument("--dry-run", action="store_true", help="Report changes but do not write files.")
    ap.add_argument("--no-backup", action="store_true", help="Do not write .bak backups before editing.")
    ap.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Folder name to exclude (repeatable). Default excludes include .git, node_modules, dist, etc.",
    )
    ap.add_argument(
        "--include-ext",
        action="append",
        default=[],
        help="Only process files with these extensions (repeatable), e.g. --include-ext .ts --include-ext .md",
    )

    args = ap.parse_args()
    root = Path(args.root).resolve()
    excludes = set(DEFAULT_EXCLUDES) | set(args.exclude)
    include_ext = set(args.include_ext)

    if not root.exists():
        raise SystemExit(f"Root path does not exist: {root}")

    total_files = 0
    changed_files = 0
    total_blocks = 0

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded directories
        dirnames[:] = [d for d in dirnames if d not in excludes]

        for fname in filenames:
            path = Path(dirpath) / fname

            if should_skip_path(path, excludes):
                continue

            if include_ext:
                if path.suffix not in include_ext:
                    continue

            total_files += 1

            changed, blocks, msg = process_file(
                path,
                dry_run=args.dry_run,
                backup=not args.no_backup,
            )

            if changed:
                changed_files += 1
                total_blocks += blocks
                print(f"[CHANGED] {path} -> {msg}")
            else:
                # Uncomment if you want verbose
                # print(f"[SKIP]    {path} -> {msg}")
                pass

    mode = "DRY RUN" if args.dry_run else "WRITE"
    print("\n--- Summary ---")
    print(f"Mode: {mode}")
    print(f"Scanned files: {total_files}")
    print(f"Changed files: {changed_files}")
    print(f"Conflict blocks resolved: {total_blocks}")
    if not args.dry_run and not args.no_backup:
        print("Backups: .bak files were created next to modified files.")


if __name__ == "__main__":
    main()

