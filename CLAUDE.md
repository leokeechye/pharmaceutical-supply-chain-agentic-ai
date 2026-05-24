# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A two-service monorepo for pharmaceutical supply-chain optimization:
- **Backend** (repo root) — FastAPI + a LangGraph multi-agent system, MongoDB, and ML (Prophet/LSTM forecasting, OR-Tools routing).
- **Frontend** (`frontend/`) — Next.js 16 + React 19 dashboard, Persian/RTL UI, Leaflet maps, Recharts.

The two run as **separate processes** and are wired together by a Next.js rewrite proxy (see "Frontend↔backend wiring" below).

## Commands

### Backend (Python, repo root)
```bash
pip install -r requirements.txt          # heavy: prophet, tensorflow, torch, ortools
cp env.example .env                       # then set MONGODB_URL, OPENAI_API_KEY
python scripts/load_datasets.py           # seed MongoDB (sales_history, inventory, drugs)
python main.py                            # serve on http://0.0.0.0:1020 (note: port 1020, with --reload)
# or: uvicorn main:app --host 0.0.0.0 --port 1020 --reload
black .                                   # format
mypy .                                    # type-check
```
`pytest`/`pytest-asyncio` are installed but **`tests/` contains only `__init__.py`** — there are no tests yet. Don't claim a test command works.

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev      # ⚠️ package.json script is "set PORT=3001&& next dev" — cmd.exe syntax, BREAKS on Linux/macOS/WSL.
                 # On Unix run instead:  PORT=3001 next dev   (or just `next dev` for :3000)
npm run build
npm run lint     # eslint
```

## Architecture

### Frontend↔backend wiring (read before deploying)
`frontend/next.config.ts` rewrites `/api/:path*` → **`http://localhost:1020/api/:path*`**. The frontend calls relative paths like `fetch('/api/v1/forecast/predict')` and relies on this proxy. **This hardcoded `localhost:1020` is the single biggest deployment blocker** — if you split the services across hosts (e.g. frontend on Vercel, backend elsewhere), this rewrite must change to the backend's public URL (ideally via an env var), or the frontend's API calls 404.

### Backend request flow
`main.py` defines all routes and **lazily imports the relevant agent inside each handler** (e.g. `from agents.forecasting_agent import ForecastingAgent`), runs the agent's sync method in a thread executor with an `asyncio.wait_for` timeout (forecast 120s, route 60s, inventory 90s, workflow 300s). Endpoints:
- `POST /api/v1/forecast/predict` → `ForecastingAgent` (in-memory `forecast_cache`, 60-min TTL)
- `POST /api/v1/routes/optimize` → `RouteOptimizationAgent` (OR-Tools)
- `POST /api/v1/inventory/match` → `InventoryMatchingAgent` (OpenAI analysis)
- `GET  /api/v1/alerts` → `MonitoringAgent` (OpenAI insights)
- `POST /api/v1/workflow/execute` → `SupplyChainWorkflow` (LangGraph, runs all agents in sequence)
- `GET  /api/v1/dashboard/kpi[s]`, `/dashboard/alerts/summary` → **hardcoded mock values** (marked `# TODO: Calculate real KPIs`) — not real data.

### Agents (`agents/`)
Five agents plus an orchestrator. `langgraph_workflow.py::SupplyChainWorkflow` builds a `StateGraph` over `SupplyChainState` (TypedDict) chaining forecast → route → inventory → monitoring. The orchestrator is invoked only via `/api/v1/workflow/execute`; the other endpoints call agents directly.

### Data layer (`utils/database.py`)
MongoDB via `pymongo` (sync). `get_database()` lazily connects using `MONGODB_URL`/`DATABASE_NAME`. Collections: `sales_history`, `inventory`, `drugs`. Sales queries aggregate per-day server-side to cap payload. `scripts/load_datasets.py` seeds the DB — **the app returns empty/degraded results until this is run against a populated MongoDB.** (`motor` is in requirements but the code uses sync `pymongo`.)

### Graceful degradation is pervasive — preserve it
Every heavy/optional dependency is wrapped in `try/except ImportError` with an `*_AVAILABLE` flag: `prophet`, `tensorflow` (LSTM), `langgraph`, `openai`. Agents fall back when a dep or key is missing (e.g. monitoring/inventory skip AI insights without `OPENAI_API_KEY`; workflow degrades without langgraph). When editing agents, keep this pattern so a partial environment still boots.

### OpenAI key loading quirk
`monitoring_agent.py` / `inventory_matching_agent.py` read `OPENAI_API_KEY` from the environment **and**, as a fallback, by line-parsing a local file (`env.txt`/`.env`). LLM model is `gpt-4o-mini`. Missing key → AI insights silently disabled, not an error.

## Deployment notes
- **No Dockerfile or compose file exists** for either service — they'd need to be written.
- Backend is heavyweight: `torch` + `tensorflow` + `prophet` + `ortools` make for a multi-GB image and slow builds. `prophet` compiles Stan. Consider trimming unused ML deps before containerizing.
- Backend needs a reachable **MongoDB** (Atlas or a managed instance); `env.example` defaults to `localhost:27017`.
- `main.py` uses deprecated `@app.on_event("startup"/"shutdown")` hooks (currently empty TODO bodies) — migrate to a lifespan handler if you touch startup logic.

## Reference docs
`README.md` (root) and `PRD_AgenticAI_PakhshMomtaz.md` are extensive product/architecture docs. `frontend/README.md` is in Persian and lists the dashboard pages (forecasting, inventory, routes, alerts, reports).
