# Hugging Face Spaces (Docker) — backend API only.
# Build context: repo root (KOMPAR). See README.md YAML front matter.

FROM python:3.11-slim

WORKDIR /app/backend

COPY anime-parallel-recommender/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY anime-parallel-recommender/backend/ .
COPY anime-parallel-recommender/dataset/ /app/dataset

RUN python preprocessing.py --target-size 0

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
