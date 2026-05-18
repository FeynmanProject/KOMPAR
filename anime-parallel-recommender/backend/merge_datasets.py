"""Merge external MAL-style CSV dumps into the project's canonical ``anime.csv``.

Sources (place extracts under ``dataset/raw/``):
    - anime.csv      — Kaggle-style MAL export (MAL_ID, Name, Genres, Studios, …)
    - AnimeList.csv  — richer rows (anime_id, title, image_url, background, …)

Rows are keyed by MyAnimeList id, merged field-by-field (prefer synopsis/images
from AnimeList when present), then written with sequential ``id`` columns for
``preprocessing.py``.

Usage:
    python merge_datasets.py
    python merge_datasets.py --mal ../dataset/raw/anime.csv --list ../dataset/raw/AnimeList.csv
"""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MAL = BASE_DIR.parent / "dataset" / "raw" / "anime.csv"
DEFAULT_LIST = BASE_DIR.parent / "dataset" / "raw" / "AnimeList.csv"
DEFAULT_OUT = BASE_DIR.parent / "dataset" / "anime.csv"

YEAR_RE = re.compile(r"(19|20)\d{2}")


def _safe_str(value: object, default: str = "") -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return default
    return str(value).strip()


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        s = str(value).strip()
        if s.lower() in ("unknown", "n/a", ""):
            return default
        return float(s)
    except (TypeError, ValueError):
        return default


def _safe_int(value: object, default: int = 0) -> int:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        s = str(value).strip()
        if s.lower() in ("unknown", "n/a", ""):
            return default
        return int(float(s))
    except (TypeError, ValueError):
        return default


def _extract_year(*values: object) -> int:
    for value in values:
        s = _safe_str(value)
        if not s:
            continue
        match = YEAR_RE.search(s)
        if match:
            return int(match.group())
    return 0


def _normalise_genres(value: object) -> str:
    s = _safe_str(value)
    if not s:
        return ""
    tokens = [t.strip() for t in re.split(r"[,;|]", s) if t.strip()]
    seen: list[str] = []
    for t in tokens:
        if t not in seen:
            seen.append(t)
    return ", ".join(seen)


def _normalise_status(value: object) -> str:
    s = _safe_str(value)
    if not s:
        return "Unknown"
    # AnimeList uses "Finished Airing", MAL export may omit status
    low = s.lower()
    if "finish" in low or "completed" in low:
        return "Finished"
    if "airing" in low and "not" not in low:
        return "Airing"
    if "not yet" in low:
        return "Not yet aired"
    return s


def _clip_synopsis(text: str, max_len: int = 1200) -> str:
    text = _safe_str(text)
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def row_from_mal(row: pd.Series) -> dict:
    mal_id = _safe_int(row.get("MAL_ID"), 0)
    title = _safe_str(row.get("Name")) or _safe_str(row.get("English name"))
    return {
        "mal_id": mal_id,
        "title": title,
        "genres": _normalise_genres(row.get("Genres")),
        "themes": "",
        "studio": _safe_str(row.get("Studios"), "Unknown"),
        "score": _safe_float(row.get("Score"), 0.0),
        "episodes": _safe_int(row.get("Episodes"), 0),
        "type": _safe_str(row.get("Type"), "TV"),
        "release_year": _extract_year(row.get("Premiered"), row.get("Aired")),
        "status": "Unknown",
        "synopsis": "",
        "image_url": "",
    }


def row_from_animelist(row: pd.Series) -> dict:
    mal_id = _safe_int(row.get("anime_id"), 0)
    title = _safe_str(row.get("title")) or _safe_str(row.get("title_english"))
    studio = _safe_str(row.get("studio"), "Unknown")
    if studio.lower() in ("unknown", "none", ""):
        studio = "Unknown"
    return {
        "mal_id": mal_id,
        "title": title,
        "genres": _normalise_genres(row.get("genre")),
        "themes": "",
        "studio": studio,
        "score": _safe_float(row.get("score"), 0.0),
        "episodes": _safe_int(row.get("episodes"), 0),
        "type": _safe_str(row.get("type"), "TV"),
        "release_year": _extract_year(row.get("premiered"), row.get("aired_string"), row.get("aired")),
        "status": _normalise_status(row.get("status")),
        "synopsis": _clip_synopsis(_safe_str(row.get("background"))),
        "image_url": normalize_image_url(_safe_str(row.get("image_url"))),
    }


def merge_record(existing: dict, incoming: dict) -> dict:
    """Combine two normalised rows with the same ``mal_id``."""
    out = dict(existing)
    for key, new_val in incoming.items():
        if key == "mal_id":
            continue
        old_val = out.get(key)
        if key == "synopsis":
            if len(_safe_str(new_val)) > len(_safe_str(old_val)):
                out[key] = new_val
        elif key == "image_url":
            if _safe_str(new_val) and not _safe_str(old_val):
                out[key] = new_val
        elif key == "genres":
            if len(_safe_str(new_val)) > len(_safe_str(old_val)):
                out[key] = new_val
        elif key == "studio" and _safe_str(old_val, "Unknown") == "Unknown" and _safe_str(new_val):
            out[key] = new_val
        elif key == "status" and _safe_str(old_val, "Unknown") == "Unknown" and _safe_str(new_val):
            out[key] = new_val
        elif key in ("score", "episodes", "release_year"):
            if (not old_val or old_val == 0) and new_val:
                out[key] = new_val
        elif key == "title" and len(_safe_str(new_val)) > len(_safe_str(old_val)):
            out[key] = new_val
        elif not _safe_str(old_val) and _safe_str(new_val):
            out[key] = new_val
    return out


def load_and_merge(mal_path: Path, list_path: Path) -> pd.DataFrame:
    by_mal: dict[int, dict] = {}

    if mal_path.exists():
        mal_df = pd.read_csv(mal_path)
        for _, row in mal_df.iterrows():
            rec = row_from_mal(row)
            if not rec["mal_id"] or not rec["title"]:
                continue
            by_mal[rec["mal_id"]] = rec
        print(f"[merge] MAL export: {len(mal_df)} rows → {len(by_mal)} keyed")
    else:
        print(f"[merge] skip missing MAL file: {mal_path}")

    if list_path.exists():
        list_df = pd.read_csv(list_path)
        added = updated = 0
        for _, row in list_df.iterrows():
            rec = row_from_animelist(row)
            if not rec["mal_id"] or not rec["title"]:
                continue
            mid = rec["mal_id"]
            if mid in by_mal:
                by_mal[mid] = merge_record(by_mal[mid], rec)
                updated += 1
            else:
                by_mal[mid] = rec
                added += 1
        print(f"[merge] AnimeList: {len(list_df)} rows → +{added} new, {updated} merged")
    else:
        print(f"[merge] skip missing AnimeList file: {list_path}")

    records = [by_mal[k] for k in sorted(by_mal)]
    records = [r for r in records if r["title"]]
    for i, rec in enumerate(records, start=1):
        rec.pop("mal_id", None)
        rec["id"] = i

    columns = [
        "id",
        "title",
        "genres",
        "themes",
        "studio",
        "score",
        "episodes",
        "type",
        "release_year",
        "status",
        "synopsis",
        "image_url",
    ]
    return pd.DataFrame(records)[columns]


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge MAL CSV dumps into dataset/anime.csv")
    parser.add_argument("--mal", type=Path, default=DEFAULT_MAL, help="Kaggle-style anime.csv")
    parser.add_argument("--list", type=Path, default=DEFAULT_LIST, help="AnimeList.csv export")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output canonical CSV")
    args = parser.parse_args()

    df = load_and_merge(args.mal, args.list)
    if df.empty:
        raise SystemExit("No rows after merge — check input paths.")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    backup = args.out.with_suffix(".sample-150.csv")
    if args.out.exists() and not backup.exists() and len(pd.read_csv(args.out)) < 500:
        args.out.rename(backup)
        print(f"[merge] backed up previous small dataset → {backup.name}")

    df.to_csv(args.out, index=False)
    print(f"[merge] wrote {len(df)} rows → {args.out}")


if __name__ == "__main__":
    main()
