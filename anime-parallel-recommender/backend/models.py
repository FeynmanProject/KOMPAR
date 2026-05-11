"""SQLAlchemy ORM models for the anime dataset.

Each Anime row mirrors the structure of `dataset/anime.csv`. Multi-valued fields
such as `genres` and `themes` are stored as comma-separated strings inside
SQLite for simplicity and parsed back into lists when the API loads the
dataset for similarity computation.
"""

from __future__ import annotations

from sqlalchemy import Column, Float, Integer, String, Text

from database import Base


class Anime(Base):
    __tablename__ = "anime"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    genres = Column(String(512), nullable=False, default="")
    themes = Column(String(512), nullable=False, default="")
    studio = Column(String(255), nullable=False, default="")
    score = Column(Float, nullable=False, default=0.0)
    episodes = Column(Integer, nullable=False, default=0)
    type = Column(String(32), nullable=False, default="TV")
    release_year = Column(Integer, nullable=False, default=0)
    status = Column(String(64), nullable=False, default="Unknown")
    synopsis = Column(Text, nullable=False, default="")
    image_url = Column(String(512), nullable=False, default="")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "genres": [g.strip() for g in self.genres.split(",") if g.strip()],
            "themes": [t.strip() for t in self.themes.split(",") if t.strip()],
            "studio": self.studio,
            "score": self.score,
            "episodes": self.episodes,
            "type": self.type,
            "release_year": self.release_year,
            "status": self.status,
            "synopsis": self.synopsis,
            "image_url": self.image_url,
        }
