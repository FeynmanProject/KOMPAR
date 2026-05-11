"""Content-based similarity scoring used by both the serial and the parallel
search engines.

All functions in this module are top-level (i.e. no closures and no instance
methods) so they can be pickled and shipped to worker processes by
``multiprocessing`` / ``concurrent.futures.ProcessPoolExecutor``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

GENRE_WEIGHT = 0.40
THEME_WEIGHT = 0.20
RATING_WEIGHT = 0.15
EPISODE_WEIGHT = 0.10
YEAR_WEIGHT = 0.10
STUDIO_WEIGHT = 0.05

MAX_RATING_DIFF = 10.0
MAX_EPISODE_DIFF = 500.0
MAX_YEAR_DIFF = 50.0


def _jaccard(set_a: List[str], set_b: List[str]) -> float:
    """Jaccard similarity = |A ∩ B| / |A ∪ B|.

    Returns 0 when both sets are empty, which is the safe neutral value.
    """
    a = {x.lower().strip() for x in set_a if x and x.strip()}
    b = {x.lower().strip() for x in set_b if x and x.strip()}
    if not a and not b:
        return 0.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _bounded(value: float) -> float:
    """Clamp a value to the [0, 1] range."""
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def calculate_similarity(favorite: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[float, Dict[str, float]]:
    """Compute the weighted similarity between ``favorite`` and ``candidate``.

    Returns ``(total_score, breakdown_dict)``. Both anime are expected to be the
    plain dictionaries produced by ``Anime.to_dict()`` (i.e. ``genres`` and
    ``themes`` are already lists, numeric fields are already numeric).
    """
    genre_sim = _jaccard(favorite.get("genres", []), candidate.get("genres", []))
    theme_sim = _jaccard(favorite.get("themes", []), candidate.get("themes", []))

    fav_studio = (favorite.get("studio") or "").strip().lower()
    cand_studio = (candidate.get("studio") or "").strip().lower()
    studio_sim = 1.0 if fav_studio and cand_studio and fav_studio == cand_studio else 0.0

    fav_rating = float(favorite.get("score") or 0.0)
    cand_rating = float(candidate.get("score") or 0.0)
    rating_sim = _bounded(1.0 - abs(fav_rating - cand_rating) / MAX_RATING_DIFF)

    fav_eps = int(favorite.get("episodes") or 0)
    cand_eps = int(candidate.get("episodes") or 0)
    episode_sim = _bounded(1.0 - abs(fav_eps - cand_eps) / MAX_EPISODE_DIFF)

    fav_year = int(favorite.get("release_year") or 0)
    cand_year = int(candidate.get("release_year") or 0)
    if fav_year == 0 or cand_year == 0:
        year_sim = 0.0
    else:
        year_sim = _bounded(1.0 - abs(fav_year - cand_year) / MAX_YEAR_DIFF)

    total = (
        GENRE_WEIGHT * genre_sim
        + THEME_WEIGHT * theme_sim
        + RATING_WEIGHT * rating_sim
        + EPISODE_WEIGHT * episode_sim
        + YEAR_WEIGHT * year_sim
        + STUDIO_WEIGHT * studio_sim
    )

    breakdown = {
        "genre": genre_sim,
        "theme": theme_sim,
        "rating": rating_sim,
        "episode": episode_sim,
        "year": year_sim,
        "studio": studio_sim,
    }
    return total, breakdown


def build_reason(favorite: Dict[str, Any], candidate: Dict[str, Any], breakdown: Dict[str, float]) -> str:
    """Human-readable explanation of why ``candidate`` is recommended."""
    parts: List[str] = []

    shared_genres = sorted(
        {g.lower() for g in favorite.get("genres", [])}
        & {g.lower() for g in candidate.get("genres", [])}
    )
    if shared_genres:
        pretty = ", ".join(g.title() for g in shared_genres)
        parts.append(f"berbagi genre {pretty}")

    shared_themes = sorted(
        {t.lower() for t in favorite.get("themes", [])}
        & {t.lower() for t in candidate.get("themes", [])}
    )
    if shared_themes:
        pretty = ", ".join(t.title() for t in shared_themes)
        parts.append(f"memiliki tema {pretty}")

    if breakdown.get("studio", 0.0) == 1.0 and candidate.get("studio"):
        parts.append(f"diproduksi oleh studio yang sama ({candidate['studio']})")

    if breakdown.get("rating", 0.0) >= 0.9:
        parts.append(
            f"rating sangat berdekatan ({candidate.get('score', 0):.2f} vs {favorite.get('score', 0):.2f})"
        )
    elif breakdown.get("rating", 0.0) >= 0.7:
        parts.append("rating berdekatan")

    if breakdown.get("episode", 0.0) >= 0.95:
        parts.append("jumlah episode yang mirip")

    if breakdown.get("year", 0.0) >= 0.9 and candidate.get("release_year"):
        parts.append(f"rilis di era yang sama ({candidate['release_year']})")

    if not parts:
        return (
            "Anime ini direkomendasikan berdasarkan kombinasi seluruh fitur "
            "(genre, tema, rating, episode, tahun, dan studio)."
        )

    reason = "Anime ini direkomendasikan karena " + ", ".join(parts) + "."
    return reason[0].upper() + reason[1:]


def passes_filters(anime: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    """Return True if ``anime`` matches every active filter key."""
    if not filters:
        return True

    genre = filters.get("genre")
    if genre:
        genre_lower = genre.strip().lower()
        if genre_lower and genre_lower not in {g.lower() for g in anime.get("genres", [])}:
            return False

    min_rating = filters.get("min_rating")
    if min_rating is not None and float(anime.get("score") or 0.0) < float(min_rating):
        return False

    max_episodes = filters.get("max_episodes")
    if max_episodes is not None:
        eps = int(anime.get("episodes") or 0)
        if eps and eps > int(max_episodes):
            return False

    anime_type = filters.get("type")
    if anime_type:
        if (anime.get("type") or "").strip().lower() != anime_type.strip().lower():
            return False

    start_year = filters.get("start_year")
    if start_year is not None and int(anime.get("release_year") or 0) and int(anime.get("release_year")) < int(start_year):
        return False

    end_year = filters.get("end_year")
    if end_year is not None and int(anime.get("release_year") or 0) and int(anime.get("release_year")) > int(end_year):
        return False

    status = filters.get("status")
    if status:
        if (anime.get("status") or "").strip().lower() != status.strip().lower():
            return False

    return True


def score_one(favorite: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Score a single candidate and return a recommendation dict."""
    total, breakdown = calculate_similarity(favorite, candidate)
    return {
        "anime": candidate,
        "similarity_score": total,
        "similarity_percentage": round(total * 100.0, 2),
        "breakdown": {k: round(v, 4) for k, v in breakdown.items()},
        "reason": build_reason(favorite, candidate, breakdown),
    }
