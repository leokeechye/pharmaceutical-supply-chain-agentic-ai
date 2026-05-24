# Backend — Pharmaceutical Supply Chain Agentic AI (FastAPI)
FROM python:3.11-slim

WORKDIR /app

# build-essential covers any source builds (prophet/cmdstanpy, ortools);
# curl is used by the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway/most hosts inject $PORT; default to the app's 1020 for plain `docker run`.
ENV API_PORT=1020
EXPOSE 1020

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-1020}/health || exit 1

# sh -c so ${PORT} expands at runtime (exec-form would pass it literally).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-1020}"]
