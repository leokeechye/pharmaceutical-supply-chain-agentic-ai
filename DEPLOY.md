# Deploying to Railway (two services + MongoDB Atlas)

This is a monorepo with **two deployable services** that run as separate
Railway services, plus an external MongoDB (Atlas).

```
┌── Railway project ─────────────────────────────┐
│  frontend service   (Next.js, Dockerfile)       │
│      └─ BACKEND_URL ─────────┐                   │
│  backend service    (FastAPI, Dockerfile)  ◀────┘│
│      └─ MONGODB_URL ─────────────────┐           │
└──────────────────────────────────────┼──────────┘
                                        ▼
                          MongoDB Atlas (SupplyChainCluster0)
```

## 0. Prereqs
- MongoDB Atlas cluster reachable (Network Access allows Railway, e.g. `0.0.0.0/0`).
- Data seeded: `MONGODB_URL=... DATABASE_NAME=pharma_supply_chain python scripts/seed_synthetic.py`
  (12 drugs, 60 inventory rows across 5 branches, 365-day sales history).

## 1. Backend service (FastAPI)
- New service → Deploy from this GitHub repo. **Root directory: repo root** (default).
- Railway detects the root `Dockerfile` + `railway.json` (healthcheck `/health`).
- Variables:
  | Name | Value |
  |---|---|
  | `MONGODB_URL` | `mongodb+srv://USER:PASS@supplychaincluster0.xwqgp5.mongodb.net/?appName=SupplyChainCluster0` |
  | `DATABASE_NAME` | `pharma_supply_chain` |
  | `OPENAI_API_KEY` | your key (optional — AI insights degrade gracefully without it) |
  - **Do not set `PORT`** — Railway injects it; the Dockerfile binds `${PORT}` via `sh -c`.
- First build is slow (~3–6 min: `prophet` may compile, `ortools` is large). `tensorflow`/`torch`
  are commented out in `requirements.txt` (LSTM path disabled; Prophet is the default and works).
- After deploy, note the backend's public URL (e.g. `https://<backend>.up.railway.app`) and confirm
  `GET /health` returns `{"status":"healthy"}` and `/docs` loads.

## 2. Frontend service (Next.js)
- New service in the **same project** → same GitHub repo, but **Root directory: `frontend`**.
  Railway then uses `frontend/Dockerfile` + `frontend/railway.json`.
- Variables:
  | Name | Value |
  |---|---|
  | `BACKEND_URL` | the backend service URL from step 1 (public `https://…` or private `http://<backend>.railway.internal:1020`) |
  - `next.config.ts` reads `BACKEND_URL` at server start and proxies `/api/*` → backend. Set it
    **before** the deploy finishes, or restart the service after setting it (it's read at boot).
- The frontend calls relative `/api/v1/...` paths; the rewrite proxy forwards them to the backend.
  The backend's CORS is already `*`, so the private-network URL works fine too.

## 3. Verify end-to-end
Open the frontend URL. The dashboard should load KPIs; the Forecasting page should return a
Prophet forecast for a seeded drug (`item_id` = `amoxicillin_500mg`, `metformin_850mg`, …);
Alerts should list low-stock branches; Inventory should show transfer suggestions
(seed data has deliberate surplus/deficit, e.g. amoxicillin Shiraz→Tabriz).

## Notes / gotchas
- **Two services, not one** — the FastAPI backend can't be Vercel serverless (heavy ML + long
  timeouts), so Railway hosts both.
- **`frontend/src/lib/utils.ts`** was missing upstream and is required for the build — it's been
  added. Without it the Next build fails with a `@/lib/utils` module-not-found.
- **Re-seeding** wipes and reloads `drugs`/`inventory`/`sales_history`. Safe to re-run.
- **LSTM**: to enable `model=lstm`, uncomment `tensorflow`/`torch` in `requirements.txt`
  (expect a much larger image and slower build; may need a higher Railway memory tier).
- `main.py` uses deprecated `@app.on_event` startup/shutdown hooks (empty) — fine to leave;
  migrate to a lifespan handler if you add startup logic.
