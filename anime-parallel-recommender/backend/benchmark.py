"""Benchmark harness: runs the serial baseline + the parallel engine for
several worker counts and reports speedup + efficiency for each.

Speedup        = serial_time / parallel_time
Efficiency     = speedup / num_workers

A serial run takes T_s seconds. A parallel run with N workers ideally takes
T_s / N seconds (Speedup = N, Efficiency = 1.0). In practice, Amdahl's law
plus process-creation overhead keep speedup below N, especially when N
exceeds the physical core count.

To smooth out short-term noise (especially noticeable on Apple Silicon where
the OS scheduler may park processes on slower efficiency cores), each
measurement is repeated ``repeats`` times and we report the **best** time.
Reporting the minimum is the standard practice in micro-benchmarking because
it best approximates the inherent cost without measurement noise.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from parallel_engine import parallel_similarity_search
from serial_engine import serial_similarity_search


def run_benchmark(
    favorite: Dict[str, Any],
    dataset: List[Dict[str, Any]],
    worker_options: List[int],
    filters: Dict[str, Any] | None = None,
    top_n: int = 10,
    repeats: int = 3,
) -> Tuple[float, int, int, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Run the serial baseline then one parallel run per entry in
    ``worker_options``. Each measurement is repeated ``repeats`` times and we
    keep the best (min) time.

    Returns ``(serial_time, dataset_size, candidate_count, recommendations,
    parallel_points)`` where ``parallel_points`` is a list of
    ``{num_workers, parallel_time, speedup, efficiency}`` dicts and
    ``recommendations`` is the top-N list produced by the serial run (which
    matches the parallel results bit-for-bit because the same scoring function
    is used).
    """
    filters = filters or {}
    repeats = max(1, repeats)

    serial_time = float("inf")
    serial_recs: List[Dict[str, Any]] = []
    candidate_count = 0
    for _ in range(repeats):
        recs, elapsed, candidate_count = serial_similarity_search(
            favorite, dataset, filters=filters, top_n=top_n
        )
        if elapsed < serial_time:
            serial_time = elapsed
            serial_recs = recs

    parallel_points: List[Dict[str, Any]] = []
    for n in sorted(set(worker_options)):
        if n < 1:
            continue
        best_time = float("inf")
        best_workers = n
        for _ in range(repeats):
            _, parallel_time, _, actual_workers = parallel_similarity_search(
                favorite, dataset, num_workers=n, filters=filters, top_n=top_n
            )
            if parallel_time < best_time:
                best_time = parallel_time
                best_workers = actual_workers
        if best_time <= 0.0:
            speedup = 0.0
            efficiency = 0.0
        else:
            speedup = serial_time / best_time
            efficiency = speedup / best_workers if best_workers > 0 else 0.0
        parallel_points.append(
            {
                "num_workers": best_workers,
                "parallel_time": best_time,
                "speedup": speedup,
                "efficiency": efficiency,
            }
        )

    return serial_time, len(dataset), candidate_count, serial_recs, parallel_points
