"""Pydantic schemas describing request bodies and response payloads."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AnimeSchema(BaseModel):
    id: int
    title: str
    genres: List[str]
    themes: List[str]
    studio: str
    score: float
    episodes: int
    type: str
    release_year: int
    status: str
    synopsis: str
    image_url: str


class FilterSchema(BaseModel):
    genre: Optional[str] = None
    min_rating: Optional[float] = None
    max_episodes: Optional[int] = None
    type: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    status: Optional[str] = None


class RecommendationRequest(BaseModel):
    anime_id: int
    filters: FilterSchema = Field(default_factory=FilterSchema)
    top_n: int = 10


class ParallelRecommendationRequest(RecommendationRequest):
    num_workers: int = 4


class Recommendation(BaseModel):
    anime: AnimeSchema
    similarity_score: float
    similarity_percentage: float
    breakdown: dict
    reason: str


class SerialResponse(BaseModel):
    mode: str = "serial"
    execution_time: float
    dataset_size: int
    candidate_count: int
    recommendations: List[Recommendation]


class ParallelResponse(BaseModel):
    mode: str = "parallel"
    execution_time: float
    dataset_size: int
    candidate_count: int
    num_workers: int
    recommendations: List[Recommendation]


class BenchmarkRequest(BaseModel):
    anime_id: int
    worker_options: List[int] = Field(default_factory=lambda: [2, 4, 8])
    filters: FilterSchema = Field(default_factory=FilterSchema)
    top_n: int = 10


class ParallelBenchmarkPoint(BaseModel):
    num_workers: int
    parallel_time: float
    speedup: float
    efficiency: float


class BenchmarkResponse(BaseModel):
    dataset_size: int
    candidate_count: int
    serial_time: float
    parallel_results: List[ParallelBenchmarkPoint]
    recommendations: List[Recommendation]
