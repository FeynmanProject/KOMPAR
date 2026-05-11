"""FastAPI entry point for the anime parallel recommender.

The dataset is loaded once from SQLite into an in-memory list at startup, so
every recommendation request operates on a hot in-memory dataset. This keeps
the comparison between the serial and parallel engines fair: both engines see
the exact same Python list of anime dicts.

Endpoints
---------
GET  /                       Health check.
GET  /anime/search?query=    Substring search by title.
GET  /anime/{id}             Single anime lookup.
GET  /anime/meta/dataset     Dataset metadata + facet values for the UI.
POST /recommend/serial       Run the serial engine.
POST /recommend/parallel     Run the parallel engine.
POST /benchmark              Run serial + parallel for several worker counts.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from benchmark import run_benchmark
from database import SessionLocal, init_db
from models import Anime
from parallel_engine import ensure_pool, parallel_similarity_search, shutdown_pool
from schemas import (
    AnimeSchema,
    BenchmarkRequest,
    BenchmarkResponse,
    ParallelBenchmarkPoint,
    ParallelRecommendationRequest,
    ParallelResponse,
    Recommendation,
    RecommendationRequest,
    SerialResponse,
)
from serial_engine import serial_similarity_search

app = FastAPI(
    title="Anime Parallel Recommender",
    description=(
        "Sistem rekomendasi anime berbasis content-based similarity dengan "
        "perbandingan eksekusi serial vs paralel (multiprocessing)."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATASET_CACHE: List[Dict[str, Any]] = []
DATASET_INDEX: Dict[int, Dict[str, Any]] = {}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _load_dataset_into_memory() -> None:
    """Materialise every Anime row from SQLite into an in-memory list.

    This is called on startup and after preprocessing. Loading the data once
    avoids paying ORM overhead on every recommendation request and keeps the
    serial vs parallel comparison meaningful (both engines work on identical
    plain Python dicts).
    """
    global DATASET_CACHE, DATASET_INDEX
    session = SessionLocal()
    try:
        rows = session.query(Anime).all()
        DATASET_CACHE = [r.to_dict() for r in rows]
        DATASET_INDEX = {a["id"]: a for a in DATASET_CACHE}
    finally:
        session.close()


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    _load_dataset_into_memory()
    if DATASET_CACHE:
        # Warm a persistent process pool sized to the available cores. Workers
        # receive the dataset via the ``initializer`` argument so every
        # subsequent /recommend/parallel request only ships index ranges
        # instead of repickling the whole dataset.
        ensure_pool(DATASET_CACHE, max(1, os.cpu_count() or 1))


@app.on_event("shutdown")
def on_shutdown() -> None:
    shutdown_pool()


def _ensure_dataset() -> None:
    if not DATASET_CACHE:
        _load_dataset_into_memory()
    if not DATASET_CACHE:
        raise HTTPException(
            status_code=503,
            detail=(
                "Dataset masih kosong. Jalankan `python preprocessing.py` "
                "di folder backend terlebih dahulu."
            ),
        )


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "name": "Anime Parallel Recommender",
        "version": app.version,
        "dataset_size": len(DATASET_CACHE),
    }


@app.get("/anime/search", response_model=List[AnimeSchema])
def search_anime(query: str = Query(..., min_length=1), limit: int = 20) -> List[AnimeSchema]:
    _ensure_dataset()
    q = query.strip().lower()
    if not q:
        return []
    matches: List[Dict[str, Any]] = []
    for anime in DATASET_CACHE:
        if q in anime["title"].lower():
            matches.append(anime)
            if len(matches) >= limit:
                break
    return matches  # type: ignore[return-value]


@app.get("/anime/meta/dataset")
def dataset_meta() -> Dict[str, Any]:
    _ensure_dataset()
    genres: set[str] = set()
    types: set[str] = set()
    studios: set[str] = set()
    statuses: set[str] = set()
    min_year = 9999
    max_year = 0
    for anime in DATASET_CACHE:
        for g in anime["genres"]:
            genres.add(g)
        types.add(anime["type"] or "")
        studios.add(anime["studio"] or "")
        statuses.add(anime["status"] or "")
        if anime["release_year"]:
            min_year = min(min_year, anime["release_year"])
            max_year = max(max_year, anime["release_year"])
    return {
        "dataset_size": len(DATASET_CACHE),
        "genres": sorted(g for g in genres if g),
        "types": sorted(t for t in types if t),
        "studios": sorted(s for s in studios if s),
        "statuses": sorted(s for s in statuses if s),
        "min_year": min_year if min_year != 9999 else 0,
        "max_year": max_year,
    }


@app.get("/anime/{anime_id}", response_model=AnimeSchema)
def get_anime(anime_id: int) -> AnimeSchema:
    _ensure_dataset()
    anime = DATASET_INDEX.get(anime_id)
    if anime is None:
        raise HTTPException(status_code=404, detail=f"Anime dengan id {anime_id} tidak ditemukan.")
    return anime  # type: ignore[return-value]


def _favorite_or_404(anime_id: int) -> Dict[str, Any]:
    fav = DATASET_INDEX.get(anime_id)
    if fav is None:
        raise HTTPException(
            status_code=404,
            detail=f"Anime favorit dengan id {anime_id} tidak ditemukan dalam dataset.",
        )
    return fav


def _filters_dict(filters) -> Dict[str, Any]:
    return filters.model_dump(exclude_none=True) if filters else {}


def _serialise_recommendations(raw: List[Dict[str, Any]]) -> List[Recommendation]:
    return [Recommendation(**r) for r in raw]


@app.post("/recommend/serial", response_model=SerialResponse)
def recommend_serial(req: RecommendationRequest) -> SerialResponse:
    _ensure_dataset()
    favorite = _favorite_or_404(req.anime_id)
    filters = _filters_dict(req.filters)

    recs, elapsed, candidate_count = serial_similarity_search(
        favorite, DATASET_CACHE, filters=filters, top_n=req.top_n
    )

    if candidate_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada rekomendasi yang sesuai dengan filter. Coba longgarkan filter Anda.",
        )

    return SerialResponse(
        execution_time=elapsed,
        dataset_size=len(DATASET_CACHE),
        candidate_count=candidate_count,
        recommendations=_serialise_recommendations(recs),
    )


@app.post("/recommend/parallel", response_model=ParallelResponse)
def recommend_parallel(req: ParallelRecommendationRequest) -> ParallelResponse:
    _ensure_dataset()
    favorite = _favorite_or_404(req.anime_id)
    filters = _filters_dict(req.filters)

    recs, elapsed, candidate_count, actual_workers = parallel_similarity_search(
        favorite,
        DATASET_CACHE,
        num_workers=req.num_workers,
        filters=filters,
        top_n=req.top_n,
    )

    if candidate_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada rekomendasi yang sesuai dengan filter. Coba longgarkan filter Anda.",
        )

    return ParallelResponse(
        execution_time=elapsed,
        dataset_size=len(DATASET_CACHE),
        candidate_count=candidate_count,
        num_workers=actual_workers,
        recommendations=_serialise_recommendations(recs),
    )


@app.post("/benchmark", response_model=BenchmarkResponse)
def benchmark(req: BenchmarkRequest) -> BenchmarkResponse:
    _ensure_dataset()
    favorite = _favorite_or_404(req.anime_id)
    filters = _filters_dict(req.filters)

    serial_time, dataset_size, candidate_count, recs, parallel_points = run_benchmark(
        favorite,
        DATASET_CACHE,
        worker_options=req.worker_options,
        filters=filters,
        top_n=req.top_n,
    )

    if candidate_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada rekomendasi yang sesuai dengan filter. Coba longgarkan filter Anda.",
        )

    return BenchmarkResponse(
        dataset_size=dataset_size,
        candidate_count=candidate_count,
        serial_time=serial_time,
        parallel_results=[ParallelBenchmarkPoint(**p) for p in parallel_points],
        recommendations=_serialise_recommendations(recs),
    )


@app.post("/admin/reload-dataset")
def admin_reload_dataset() -> Dict[str, Any]:
    _load_dataset_into_memory()
    if DATASET_CACHE:
        ensure_pool(DATASET_CACHE, max(1, os.cpu_count() or 1))
    return {"dataset_size": len(DATASET_CACHE)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
