"""Preprocessing pipeline that loads the anime CSV/JSON dataset, normalises
every field and persists the clean rows into SQLite (``anime.db``).

Pipeline:
    1. Read the source CSV (or JSON) into a pandas DataFrame.
    2. Drop rows without a title.
    3. Normalise ``genres`` and ``themes`` into comma-separated strings
       (after stripping whitespace) so they can fit cleanly inside a SQLite
       column. They are re-parsed back into lists on read by
       ``Anime.to_dict()``.
    4. Coerce numeric fields with sane defaults.
    5. Optionally synthesise additional rows for benchmark scaling (e.g. up to
       30,000 rows). Synthetic rows are clearly marked with the suffix
       ``[synthetic-NN]`` so they cannot be mistaken for real anime in the UI.
    6. Wipe and repopulate the SQLite ``anime`` table.

Usage:
    python preprocessing.py                       # loads the default CSV
    python preprocessing.py --source path.csv     # custom source file
    python preprocessing.py --target-size 20000   # synthesise up to 20k rows
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable, List

import pandas as pd

from database import Base, SessionLocal, engine
from models import Anime

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_SOURCE = BASE_DIR.parent / "dataset" / "anime.csv"

REQUIRED_COLUMNS = [
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


def _normalise_list(value: object) -> str:
    """Turn ``value`` into a clean comma-separated string of unique tokens."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    if isinstance(value, list):
        tokens = [str(v).strip() for v in value]
    else:
        tokens = [t.strip() for t in str(value).split(",")]
    seen: list[str] = []
    for t in tokens:
        if t and t not in seen:
            seen.append(t)
    return ", ".join(seen)


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: object, default: int = 0) -> int:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _safe_str(value: object, default: str = "") -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return default
    return str(value).strip()


def load_dataframe(source: Path) -> pd.DataFrame:
    """Read the source file (CSV or JSON) into a DataFrame."""
    if not source.exists():
        raise FileNotFoundError(f"Anime dataset not found at {source}")

    if source.suffix.lower() == ".json":
        df = pd.read_json(source)
    else:
        df = pd.read_csv(source)

    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            df[col] = None
    return df[REQUIRED_COLUMNS]


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.dropna(subset=["title"])
    df["title"] = df["title"].map(lambda v: _safe_str(v))
    df["genres"] = df["genres"].map(_normalise_list)
    df["themes"] = df["themes"].map(_normalise_list)
    df["studio"] = df["studio"].map(lambda v: _safe_str(v, "Unknown"))
    df["score"] = df["score"].map(lambda v: _safe_float(v, 0.0))
    df["episodes"] = df["episodes"].map(lambda v: _safe_int(v, 0))
    df["type"] = df["type"].map(lambda v: _safe_str(v, "TV"))
    df["release_year"] = df["release_year"].map(lambda v: _safe_int(v, 0))
    df["status"] = df["status"].map(lambda v: _safe_str(v, "Unknown"))
    df["synopsis"] = df["synopsis"].map(lambda v: _safe_str(v, ""))
    df["image_url"] = df["image_url"].map(lambda v: _safe_str(v, ""))
    df = df[df["title"] != ""].reset_index(drop=True)
    df["id"] = range(1, len(df) + 1)
    return df


def synthesise(df: pd.DataFrame, target_size: int) -> pd.DataFrame:
    """Pad the dataframe up to ``target_size`` rows by duplicating real entries
    and mutating their numeric fields slightly. Synthetic rows have their
    titles suffixed with ``[synthetic-N]`` so the UI clearly differentiates
    them from real anime. They exist purely so the benchmark page has enough
    rows to make parallel speedup measurable.
    """
    if target_size <= len(df):
        return df

    real_rows = df.to_dict(orient="records")
    out: List[dict] = list(real_rows)
    counter = 0
    while len(out) < target_size:
        for original in real_rows:
            if len(out) >= target_size:
                break
            counter += 1
            clone = dict(original)
            clone["title"] = f"{original['title']} [synthetic-{counter}]"
            year_jitter = counter % 5
            ep_jitter = counter % 7
            score_jitter = (counter % 11) * 0.05
            clone["release_year"] = max(1960, int(original["release_year"] or 2000) + year_jitter)
            clone["episodes"] = max(1, int(original["episodes"] or 12) + ep_jitter)
            clone["score"] = max(0.0, min(10.0, float(original["score"] or 7.0) - score_jitter))
            out.append(clone)

    new_df = pd.DataFrame(out)
    new_df["id"] = range(1, len(new_df) + 1)
    return new_df


def persist(df: pd.DataFrame) -> int:
    """Wipe the anime table and insert all rows in ``df``."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        session.query(Anime).delete()
        session.commit()
        rows: Iterable[Anime] = (
            Anime(
                id=int(row["id"]),
                title=row["title"],
                genres=row["genres"],
                themes=row["themes"],
                studio=row["studio"],
                score=float(row["score"]),
                episodes=int(row["episodes"]),
                type=row["type"],
                release_year=int(row["release_year"]),
                status=row["status"],
                synopsis=row["synopsis"],
                image_url=row["image_url"],
            )
            for _, row in df.iterrows()
        )
        session.bulk_save_objects(list(rows))
        session.commit()
        return df.shape[0]
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess the anime dataset into SQLite.")
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Path to the CSV/JSON source file (default: {DEFAULT_SOURCE}).",
    )
    parser.add_argument(
        "--target-size",
        type=int,
        default=10000,
        help=(
            "Synthesise additional rows up to this size for benchmark scaling. "
            "Synthetic rows are clearly suffixed in their titles. "
            "Use 0 to keep the dataset at its original size."
        ),
    )
    args = parser.parse_args()

    print(f"[preprocessing] reading source: {args.source}")
    df = load_dataframe(args.source)
    print(f"[preprocessing] raw rows: {len(df)}")

    df = clean_dataframe(df)
    print(f"[preprocessing] after cleaning: {len(df)}")

    if args.target_size and args.target_size > len(df):
        df = synthesise(df, args.target_size)
        print(f"[preprocessing] expanded to {len(df)} rows for benchmark scaling")

    inserted = persist(df)
    print(f"[preprocessing] inserted {inserted} rows into anime.db")


if __name__ == "__main__":
    main()
