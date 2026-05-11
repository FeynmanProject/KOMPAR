"""SQLite database setup for the anime parallel recommender.

We use SQLAlchemy to manage the database connection. SQLite is sufficient
because the entire similarity workload happens in memory after the dataset is
loaded once: the parallel and serial engines operate on plain Python lists, so
the database is only used as the persistence layer.
"""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "anime.db"
DATABASE_URL = os.environ.get("ANIME_DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if they do not already exist."""
    import models  # noqa: F401  (ensure model metadata is registered)

    Base.metadata.create_all(bind=engine)
