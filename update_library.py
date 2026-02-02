#!/usr/bin/env python3
"""
Update library.csv by filling missing fields from public book metadata sources.

Fills (ONLY if blank):
- publish_year
- publisher
- cover_image

Sources:
1) Open Library (primary): https://openlibrary.org/dev/docs/api/books
2) Google Books (fallback): https://developers.google.com/books/docs/v1/using

Outputs:
- library.updated.csv

Usage:
  python update_library_csv.py /path/to/library.csv
"""

from __future__ import annotations

import csv
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen


# ----------------------------
# Helpers
# ----------------------------

def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def is_blank(val: Any) -> bool:
    if val is None:
        return True
    s = str(val).strip()
    return s == "" or s.lower() in {"nan", "none", "null"}

def normalize_isbn13(raw: Any) -> Optional[str]:
    """
    Your CSV has isbn13 as float sometimes (e.g., 9.781631e+12).
    Convert to a clean 13-digit string, preserving leading zeros if present.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "" or s.lower() == "nan":
        return None

    # If it looks like scientific notation or floaty, try to coerce to int safely
    # Examples:
    # "9.781631e+12" -> 9781631490883
    # "9781631490883.0" -> 9781631490883
    try:
        if re.fullmatch(r"\d+(\.\d+)?", s):
            # numeric string
            if "." in s:
                s = s.split(".", 1)[0]
            # Could be too short if originally had leading zeros, but ISBN13 usually doesn't start with 0
            return s if len(s) == 13 else None
        if "e" in s.lower():
            n = int(float(s))
            s2 = str(n)
            return s2 if len(s2) == 13 else None
    except Exception:
        pass

    # Strip non-digits
    digits = re.sub(r"\D+", "", s)
    if len(digits) == 13:
        return digits
    return None

def http_get_json(url: str, timeout: int = 20) -> Any:
    req = Request(url, headers={"User-Agent": "library-csv-updater/1.0"})
    with urlopen(req, timeout=timeout) as resp:
        data = resp.read().decode("utf-8")
    return json.loads(data)

def safe_int_year(value: Any) -> Optional[int]:
    """
    Extract a 4-digit year from strings like:
    "1999", "1999-01-01", "April 1999", etc.
    """
    if value is None:
        return None
    s = str(value)
    m = re.search(r"\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b", s)
    if not m:
        return None
    year = int(m.group(1))
    return year

@dataclass
class MetaResult:
    publish_year: Optional[int] = None
    publisher: Optional[str] = None
    cover_image: Optional[str] = None


# ----------------------------
# Metadata lookups
# ----------------------------

def fetch_openlibrary(isbn13: str) -> MetaResult:
    """
    Open Library Books API:
    https://openlibrary.org/api/books?bibkeys=ISBN:...&format=json&jscmd=data
    """
    params = {
        "bibkeys": f"ISBN:{isbn13}",
        "format": "json",
        "jscmd": "data",
    }
    url = "https://openlibrary.org/api/books?" + urlencode(params)
    data = http_get_json(url)

    key = f"ISBN:{isbn13}"
    if key not in data:
        return MetaResult()

    book = data[key] or {}
    year = None

    # publish_date may exist like "2013" or "May 2013"
    year = safe_int_year(book.get("publish_date"))

    # publishers is usually a list of {name: "..."}
    publisher = None
    pubs = book.get("publishers") or []
    if isinstance(pubs, list) and pubs:
        name = pubs[0].get("name") if isinstance(pubs[0], dict) else None
        if name and str(name).strip():
            publisher = str(name).strip()

    # cover may have small/medium/large
    cover_image = None
    cover = book.get("cover") or {}
    if isinstance(cover, dict):
        cover_image = cover.get("large") or cover.get("medium") or cover.get("small")

    return MetaResult(publish_year=year, publisher=publisher, cover_image=cover_image)


def fetch_googlebooks(isbn13: str) -> MetaResult:
    """
    Google Books API (no key needed for simple usage):
    https://www.googleapis.com/books/v1/volumes?q=isbn:ISBN13
    """
    params = {"q": f"isbn:{isbn13}"}
    url = "https://www.googleapis.com/books/v1/volumes?" + urlencode(params)
    data = http_get_json(url)

    items = data.get("items") or []
    if not items:
        return MetaResult()

    volume = (items[0] or {}).get("volumeInfo") or {}

    # publishedDate might be "YYYY", "YYYY-MM-DD", etc.
    year = safe_int_year(volume.get("publishedDate"))

    publisher = volume.get("publisher")
    if publisher:
        publisher = str(publisher).strip() or None

    # cover image links
    cover_image = None
    img = volume.get("imageLinks") or {}
    if isinstance(img, dict):
        cover_image = img.get("thumbnail") or img.get("smallThumbnail")

    return MetaResult(publish_year=year, publisher=publisher, cover_image=cover_image)


def lookup_metadata(isbn13: str, sleep_s: float = 0.2) -> MetaResult:
    """
    Try Open Library, then Google Books.
    Small sleep to be polite to APIs.
    """
    try:
        res = fetch_openlibrary(isbn13)
        if res.publish_year or res.publisher or res.cover_image:
            time.sleep(sleep_s)
            return res
    except Exception:
        pass

    try:
        res = fetch_googlebooks(isbn13)
        time.sleep(sleep_s)
        return res
    except Exception:
        return MetaResult()


# ----------------------------
# CSV update
# ----------------------------

def update_csv(input_csv: Path, output_csv: Path) -> None:
    with input_csv.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    # Ensure expected columns exist (add if missing)
    expected = ["publish_year", "publisher", "cover_image", "updated_at", "isbn13"]
    for col in expected:
        if col not in fieldnames:
            fieldnames.append(col)

    updated_count = 0
    looked_up = 0

    for row in rows:
        isbn13 = normalize_isbn13(row.get("isbn13"))
        if not isbn13:
            continue

        # Determine if anything is missing we want to fill
        need_year = is_blank(row.get("publish_year"))
        need_pub = is_blank(row.get("publisher")) or str(row.get("publisher")).strip() == "Unknown"
        need_cover = is_blank(row.get("cover_image"))

        if not (need_year or need_pub or need_cover):
            continue

        looked_up += 1
        meta = lookup_metadata(isbn13)

        changed = False

        if need_year and meta.publish_year:
            row["publish_year"] = str(meta.publish_year)
            changed = True

        if need_pub and meta.publisher:
            row["publisher"] = meta.publisher
            changed = True

        if need_cover and meta.cover_image:
            row["cover_image"] = meta.cover_image
            changed = True

        if changed:
            row["updated_at"] = iso_now()
            updated_count += 1

    with output_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Input:  {input_csv}")
    print(f"Output: {output_csv}")
    print(f"Looked up {looked_up} rows (had ISBN + missing fields).")
    print(f"Updated  {updated_count} rows (filled at least one blank).")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: python update_library_csv.py /path/to/library.csv")
        return 2

    input_csv = Path(argv[1]).expanduser().resolve()
    if not input_csv.exists():
        print(f"ERROR: File not found: {input_csv}")
        return 2

    output_csv = input_csv.with_name(input_csv.stem + ".updated.csv")
    update_csv(input_csv, output_csv)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

