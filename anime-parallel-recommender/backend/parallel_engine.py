"""Parallel similarity search engine.

Three optimisations make the parallel engine actually faster than the serial
one for our workload:

1. **Persistent process pool.** The pool is created once at FastAPI startup
   and reused for every request, amortising process-spawn cost (~100 ms per
   process on macOS with ``spawn``).
2. **Dataset shipped once.** The dataset is sent to each worker exactly once
   via the ``initializer`` argument of :class:`ProcessPoolExecutor`. After
   that, tasks only carry ``(favorite, start_idx, end_idx, filters)`` —
   small payloads regardless of dataset size.
3. **Workers return only their local top-K.** Each worker iterates over its
   slice of the dataset, scores every candidate that survives the filter,
   sorts the local list, and ships back only the top-K. Because the global
   top-K must be a subset of the union of per-worker top-K results, this is
   semantically equivalent to returning everything — but dramatically
   smaller to pickle. The full recommendation objects (with synopsis,
   breakdown, image URL, etc.) are reconstructed in the main process.

Because similarity scoring between the favorite anime and every other anime
is fully independent, this is an *embarrassingly parallel* workload — perfect
for ``ProcessPoolExecutor``.
"""

from __future__ import annotations

import os
import time
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Dict, List, Tuple

from similarity import calculate_similarity, passes_filters, score_one

_WORKER_STATE: Dict[str, Any] = {"dataset": None, "fingerprint": None}

_POOL: ProcessPoolExecutor | None = None
_POOL_FINGERPRINT: int | None = None
_POOL_SIZE: int = 0


def _init_worker(dataset: List[Dict[str, Any]]) -> None:
    """Runs once inside every worker process at start-up.

    Stashes the dataset in module-level state so subsequent tasks can index
    into it without re-pickling the data on every request.
    """
    _WORKER_STATE["dataset"] = dataset


def _score_range(
    args: Tuple[Dict[str, Any], int, int, Dict[str, Any], int]
) -> Tuple[List[Tuple[int, float]], int]:
    """Worker entry point.

    ``args`` is ``(favorite, start, end, filters, top_k)``.

    Returns ``(local_top_k_as_(anime_id, score)_tuples, candidate_count)``.

    Only IDs + scores are returned to keep the pickled payload tiny. The main
    process reconstructs the full recommendation objects from its in-memory
    dataset using the IDs.
    """
    favorite, start, end, filters, top_k = args
    dataset: List[Dict[str, Any]] = _WORKER_STATE["dataset"]  # type: ignore[assignment]
    scored: List[Tuple[int, float]] = []
    fav_id = favorite["id"]
    for i in range(start, end):
        anime = dataset[i]
        if anime["id"] == fav_id:
            continue
        if not passes_filters(anime, filters):
            continue
        score, _ = calculate_similarity(favorite, anime)
        scored.append((anime["id"], score))
    candidate_count = len(scored)
    if top_k > 0 and len(scored) > top_k:
        scored.sort(key=lambda t: t[1], reverse=True)
        scored = scored[:top_k]
    return scored, candidate_count


def _make_ranges(n: int, num_chunks: int) -> List[Tuple[int, int]]:
    """Split ``[0, n)`` into ``num_chunks`` half-open ranges of similar size."""
    if num_chunks <= 1:
        return [(0, n)]
    base = n // num_chunks
    remainder = n % num_chunks
    ranges: List[Tuple[int, int]] = []
    start = 0
    for i in range(num_chunks):
        end = start + base + (1 if i < remainder else 0)
        if end > start:
            ranges.append((start, end))
        start = end
    return ranges


def split_into_chunks(dataset: List[Dict[str, Any]], num_chunks: int) -> List[List[Dict[str, Any]]]:
    """Materialised chunks. Kept for documentation/teaching purposes — the
    real engine uses index ranges instead to avoid copying the data.
    """
    return [dataset[s:e] for s, e in _make_ranges(len(dataset), num_chunks)]


def process_chunk(args: Tuple[Dict[str, Any], List[Dict[str, Any]], Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Materialised-chunk worker. Kept for parity with the README pseudocode
    so readers can see the classic ``(favorite, chunk, filters)`` form."""
    favorite, chunk, filters = args
    out: List[Dict[str, Any]] = []
    fav_id = favorite["id"]
    for anime in chunk:
        if anime["id"] == fav_id:
            continue
        if not passes_filters(anime, filters):
            continue
        out.append(score_one(favorite, anime))
    return out


def _fingerprint(dataset: List[Dict[str, Any]]) -> int:
    """Cheap identifier for the dataset to detect when we need to rebuild
    the pool (e.g., after preprocessing reloaded a different set of rows).
    """
    return id(dataset)


def ensure_pool(dataset: List[Dict[str, Any]], pool_size: int) -> ProcessPoolExecutor:
    """Return a process pool whose workers already hold ``dataset`` in memory.

    Lazily creates the pool on the first call. Rebuilds it when the dataset
    identity or requested pool size changes.
    """
    global _POOL, _POOL_FINGERPRINT, _POOL_SIZE
    fp = _fingerprint(dataset)
    if _POOL is not None and _POOL_FINGERPRINT == fp and _POOL_SIZE >= pool_size:
        return _POOL
    if _POOL is not None:
        _POOL.shutdown(wait=False, cancel_futures=True)
    _POOL = ProcessPoolExecutor(
        max_workers=pool_size,
        initializer=_init_worker,
        initargs=(dataset,),
    )
    _POOL_FINGERPRINT = fp
    _POOL_SIZE = pool_size
    return _POOL


def shutdown_pool() -> None:
    """Tear down the persistent pool (e.g., on FastAPI shutdown)."""
    global _POOL, _POOL_FINGERPRINT, _POOL_SIZE
    if _POOL is not None:
        _POOL.shutdown(wait=False, cancel_futures=True)
    _POOL = None
    _POOL_FINGERPRINT = None
    _POOL_SIZE = 0


def parallel_similarity_search(
    favorite: Dict[str, Any],
    dataset: List[Dict[str, Any]],
    num_workers: int,
    filters: Dict[str, Any] | None = None,
    top_n: int = 10,
) -> Tuple[List[Dict[str, Any]], float, int, int]:
    """Run similarity scoring in parallel across ``num_workers`` processes.

    Returns ``(top_recommendations, execution_time_seconds, candidate_count,
    actual_num_workers)``. ``actual_num_workers`` may differ from
    ``num_workers`` if the dataset is smaller than the requested worker count.

    Timing covers task dispatch + worker execution + merge + sort. It does
    **not** include the one-time cost of spawning the pool, because that cost
    is amortised across the whole application lifetime — exactly mirroring
    how a real service would behave.
    """
    filters = filters or {}

    n = len(dataset)
    if num_workers < 1:
        num_workers = 1
    if num_workers > n:
        num_workers = max(1, n)

    ranges = _make_ranges(n, num_workers)
    actual_workers = len(ranges)

    cpu_cap = max(1, os.cpu_count() or 1) * 4
    pool_size = min(max(actual_workers, 1), cpu_cap)
    pool = ensure_pool(dataset, pool_size)

    start = time.perf_counter()

    worker_args = [(favorite, s, e, filters, top_n) for s, e in ranges]
    partial_results = list(pool.map(_score_range, worker_args))

    candidate_count = 0
    merged: List[Tuple[int, float]] = []
    for ids_scores, count in partial_results:
        candidate_count += count
        merged.extend(ids_scores)

    merged.sort(key=lambda t: t[1], reverse=True)
    top_pairs = merged[:top_n]

    # Reconstruct full recommendation objects in the main process. The dataset
    # lives in memory here, so this is a cheap lookup + a few breakdown +
    # reason calls — only top_n of them. No per-result pickle round-trip.
    index = {a["id"]: a for a in dataset}
    top: List[Dict[str, Any]] = []
    for anime_id, _score in top_pairs:
        candidate = index.get(anime_id)
        if candidate is None:
            continue
        top.append(score_one(favorite, candidate))

    elapsed = time.perf_counter() - start
    return top, elapsed, candidate_count, actual_workers
