"""Serial similarity search engine — single-threaded baseline.

Implementation mirrors the pseudocode in the project brief:

    for anime in dataset:
        score = calculate_similarity(favorite, anime)
        results.append((anime, score))
    sort results by score desc
    return top_n

We compute the lightweight ``calculate_similarity`` for every candidate
inside the hot loop, sort, and only then build the verbose
``Recommendation`` object (with breakdown + human-readable reason) for the
final top-N. This matches what the parallel engine does and keeps the
comparison apples-to-apples.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Tuple

from similarity import calculate_similarity, passes_filters, score_one


def serial_similarity_search(
    favorite: Dict[str, Any],
    dataset: List[Dict[str, Any]],
    filters: Dict[str, Any] | None = None,
    top_n: int = 10,
) -> Tuple[List[Dict[str, Any]], float, int]:
    """Run similarity scoring sequentially over ``dataset``.

    Returns ``(top_recommendations, execution_time_seconds, candidate_count)``.
    """
    filters = filters or {}

    start = time.perf_counter()
    scored: List[Tuple[int, float]] = []
    fav_id = favorite["id"]

    for anime in dataset:
        if anime["id"] == fav_id:
            continue
        if not passes_filters(anime, filters):
            continue
        score, _ = calculate_similarity(favorite, anime)
        scored.append((anime["id"], score))

    candidate_count = len(scored)
    scored.sort(key=lambda t: t[1], reverse=True)
    top_pairs = scored[:top_n]

    index = {a["id"]: a for a in dataset}
    recommendations: List[Dict[str, Any]] = []
    for anime_id, _ in top_pairs:
        candidate = index.get(anime_id)
        if candidate is None:
            continue
        recommendations.append(score_one(favorite, candidate))

    elapsed = time.perf_counter() - start
    return recommendations, elapsed, candidate_count
