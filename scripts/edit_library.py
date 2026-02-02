#!/usr/bin/env python3
"""
library_tools.py — merged CLI tools for gnosis library.csv

Includes:
  - fill-isbn: fill missing ISBNs using Open Library search + Books API and update metadata
              (NO cover downloading, and NO cover URL writing)
  - strip-covers: clear cover column values unless they are local paths starting with "covers/"

Source merge:
  - fill-isbn logic based on fill_missing_isbn_and_metadata.py
  - strip-covers logic based on strip_nonlocal_covers.py
"""

from __future__ import annotations

import argparse
import math
import re
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import pandas as pd
import requests

SEARCH_URL = "https://openlibrary.org/search.json"
BOOKS_URL = "https://openlibrary.org/api/books"


# -------------------------
# Shared helpers
# -------------------------
def is_nanish(x: Any) -> bool:
    if x is None:
        return True
    if isinstance(x, float) and math.isnan(x):
        return True
    s = str(x).strip()
    return s == "" or s.lower() in {"nan", "none", "null"}


def digits_only(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def normalize_text(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def token_set(s: str) -> set:
    return set(normalize_text(s).split()) if s else set()


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    inter = len(a & b)
    uni = len(a | b)
    return inter / uni if uni else 0.0


def pick_isbn13(isbn_list: List[str]) -> Optional[str]:
    """Prefer 13-digit ISBNs starting with 978/979."""
    if not isbn_list:
        return None
    cleaned = [digits_only(x) for x in isbn_list]
    for x in cleaned:
        if len(x) == 13 and (x.startswith("978") or x.startswith("979")):
            return x
    for x in cleaned:
        if len(x) == 13:
            return x
    return None


def safe_set(df: pd.DataFrame, i: int, col: str, value: Any, overwrite: bool) -> None:
    """Set df.at[i,col] = value if overwrite or current is empty/nan."""
    if col not in df.columns:
        return
    if overwrite or is_nanish(df.at[i, col]):
        df.at[i, col] = value


def coalesce_author(authors: List[str]) -> str:
    return ", ".join([a for a in authors if a])


# -------------------------
# fill-isbn implementation
# -------------------------
@dataclass
class FillConfig:
    csv_path: str
    out_path: str
    overwrite: bool
    timeout: int
    min_score: float


def openlibrary_search(title: str, author: str, timeout: int = 20) -> List[Dict[str, Any]]:
    q_parts = []
    if title:
        q_parts.append(f'title:"{title}"')
    if author:
        q_parts.append(f'author:"{author}"')
    if not q_parts:
        return []

    q = " AND ".join(q_parts)
    params = {
        "q": q,
        "limit": 20,
        "fields": "title,author_name,first_publish_year,isbn,edition_count,key",
    }
    r = requests.get(SEARCH_URL, params=params, timeout=timeout, headers={"User-Agent": "gnosis-isbn-fill/1.0"})
    if r.status_code != 200:
        return []
    data = r.json()
    return data.get("docs", []) or []


def score_candidate(row_title: str, row_author: str, doc: Dict[str, Any]) -> float:
    doc_title = doc.get("title") or ""
    doc_authors = doc.get("author_name") or []
    doc_author = doc_authors[0] if doc_authors else ""

    t_score = jaccard(token_set(row_title), token_set(doc_title))
    a_score = jaccard(token_set(row_author), token_set(doc_author))
    return (0.75 * t_score) + (0.25 * a_score)


def choose_best_doc(title: str, author: str, docs: List[Dict[str, Any]], min_score: float) -> Optional[Dict[str, Any]]:
    best = None
    best_score = 0.0
    for d in docs:
        s = score_candidate(title, author, d)
        if s > best_score:
            best_score = s
            best = d
    if best is None or best_score < min_score:
        return None
    return best


def fetch_book_data(isbn13: str, timeout: int = 20) -> Optional[Dict[str, Any]]:
    params = {"bibkeys": f"ISBN:{isbn13}", "format": "json", "jscmd": "data"}
    r = requests.get(BOOKS_URL, params=params, timeout=timeout, headers={"User-Agent": "gnosis-isbn-fill/1.0"})
    if r.status_code != 200:
        return None
    data = r.json()
    return data.get(f"ISBN:{isbn13}")


def cmd_fill_isbn(args: argparse.Namespace) -> int:
    cfg = FillConfig(
        csv_path=args.csv,
        out_path=args.out or args.csv,
        overwrite=args.overwrite,
        timeout=args.timeout,
        min_score=args.min_score,
    )

    df = pd.read_csv(cfg.csv_path)

    has_isbn13 = "isbn13" in df.columns
    has_isbn = "isbn" in df.columns
    if not (has_isbn13 or has_isbn):
        print("ERROR: CSV must contain 'isbn13' and/or 'isbn' column.", file=sys.stderr)
        return 2
    if "title" not in df.columns:
        print("ERROR: CSV must contain 'title' column.", file=sys.stderr)
        return 2

    filled = 0
    not_found = 0
    skipped = 0

    for i, row in df.iterrows():
        title = str(row.get("title", "")).strip()
        author = str(row.get("author", "")).strip() if "author" in df.columns else ""

        if not title or title.lower() == "nan":
            skipped += 1
            continue

        current_isbn13 = row.get("isbn13") if has_isbn13 else None
        current_isbn = row.get("isbn") if has_isbn else None

        missing_isbn = (has_isbn13 and is_nanish(current_isbn13)) or (has_isbn and is_nanish(current_isbn))
        if not missing_isbn:
            skipped += 1
            continue

        docs = openlibrary_search(title=title, author=author, timeout=cfg.timeout)
        best = choose_best_doc(title=title, author=author, docs=docs, min_score=cfg.min_score)
        if not best:
            not_found += 1
            continue

        isbn13 = pick_isbn13(best.get("isbn") or [])
        if not isbn13:
            not_found += 1
            continue

        # Always set ISBN when found
        if has_isbn13:
            safe_set(df, i, "isbn13", isbn13, overwrite=True)
        if has_isbn:
            safe_set(df, i, "isbn", isbn13, overwrite=True)

        # Fetch structured metadata and update row (NO cover updates)
        data = fetch_book_data(isbn13, timeout=cfg.timeout)
        if data:
            safe_set(df, i, "title", data.get("title"), overwrite=cfg.overwrite)

            authors_list = []
            if isinstance(data.get("authors"), list):
                authors_list = [a.get("name") for a in data["authors"] if isinstance(a, dict)]
            if "author" in df.columns and authors_list:
                safe_set(df, i, "author", coalesce_author(authors_list), overwrite=cfg.overwrite)

            if data.get("publish_date"):
                if "published" in df.columns:
                    safe_set(df, i, "published", data.get("publish_date"), overwrite=cfg.overwrite)
                if "publish_date" in df.columns:
                    safe_set(df, i, "publish_date", data.get("publish_date"), overwrite=cfg.overwrite)

            pubs = []
            if isinstance(data.get("publishers"), list):
                pubs = [p.get("name") for p in data["publishers"] if isinstance(p, dict)]
            if "publisher" in df.columns and pubs:
                safe_set(df, i, "publisher", ", ".join([p for p in pubs if p]), overwrite=cfg.overwrite)

        filled += 1

    df.to_csv(cfg.out_path, index=False)
    print("Done (fill-isbn).")
    print(f"Rows filled with ISBN: {filled}")
    print(f"Rows not found:       {not_found}")
    print(f"Rows skipped:         {skipped}")
    print(f"Wrote CSV:            {cfg.out_path}")
    return 0


# -------------------------
# strip-covers implementation
# -------------------------
def cmd_strip_covers(args: argparse.Namespace) -> int:
    df = pd.read_csv(args.csv)

    cover_col = args.column
    if cover_col not in df.columns:
        print(f"ERROR: Column '{cover_col}' not found in CSV.", file=sys.stderr)
        return 2

    removed = 0
    for i, val in df[cover_col].items():
        if is_nanish(val):
            continue
        s = str(val).strip()
        if not s.startswith("covers/"):
            df.at[i, cover_col] = ""
            removed += 1

    out_path = args.out or args.csv
    df.to_csv(out_path, index=False)

    print("Done (strip-covers).")
    print(f"Removed non-local covers: {removed}")
    print(f"Wrote CSV:               {out_path}")
    return 0


# -------------------------
# CLI
# -------------------------
def main() -> int:
    ap = argparse.ArgumentParser(prog="library_tools.py")
    sub = ap.add_subparsers(dest="cmd", required=True)

    # fill-isbn
    ap_fill = sub.add_parser("fill-isbn", help="Fill missing ISBNs + metadata (no cover handling).")
    ap_fill.add_argument("--csv", default="library.csv", help="Input CSV (default: library.csv)")
    ap_fill.add_argument("--out", default=None, help="Output CSV (default: overwrite input)")
    ap_fill.add_argument("--overwrite", action="store_true", help="Overwrite existing populated fields")
    ap_fill.add_argument("--timeout", type=int, default=20, help="HTTP timeout seconds (default: 20)")
    ap_fill.add_argument("--min-score", type=float, default=0.42, help="Min match score (default: 0.42)")
    ap_fill.set_defaults(func=cmd_fill_isbn)

    # strip-covers
    ap_strip = sub.add_parser("strip-covers", help="Clear cover column unless it starts with covers/.")
    ap_strip.add_argument("--csv", default="library.csv", help="Input CSV (default: library.csv)")
    ap_strip.add_argument("--out", default=None, help="Output CSV (default: overwrite input)")
    ap_strip.add_argument("--column", default="cover_image", help="Cover column name (default: cover_image)")
    ap_strip.set_defaults(func=cmd_strip_covers)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

