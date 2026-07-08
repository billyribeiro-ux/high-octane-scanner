# High-Octane Scanner

A stock **screener / scanner**, **backtester** and **forward-tester** for a stacked-moving-average
**exhaustion** strategy, built end-to-end in TypeScript. Data comes from
[Financial Modeling Prep](https://site.financialmodelingprep.com) (Ultimate plan).

- **Frontend:** Svelte 5 (runes) · SvelteKit 2 · Tailwind CSS v4 · Phosphor icons ·
  `lightweight-charts` (candlesticks) · D3 (equity/drawdown) · Threlte/Three.js (3D sector heatmap) ·
  mode-watcher · svelte-sonner · paneforge.
- **Backend:** SvelteKit server routes + a Node worker, sharing a pure engine and an embedded
  **DuckDB** cache. No external services.
- **Engine:** custom, dependency-free indicators / signals / backtester with a hand-verified
  unit-test suite.

## The strategy

Indicators on daily OHLCV: **EMA(5, 9, 21)** and **SMA(50, 100, 200)**.

- **SHORT** when the MAs are stacked **bullish** (EMA5 > EMA9 > EMA21 > SMA50 > SMA100 > SMA200)
  **and** the last **5 closes are all above EMA5** — i.e. price is overextended up, so fade it.
- **LONG** when the MAs are stacked **bearish** (EMA5 < EMA9 < EMA21 < SMA50 < SMA100 < SMA200)
  **and** the last **5 closes are all below EMA5** — overextended down, fade it.

This is a mean-reversion / exhaustion read. Signal direction is invertible via config. The
backtester adds configurable exits: **stop-loss %, take-profit (R-multiple or %), max-hold (bars),
exit-on-opposite-signal, exit-on-stack-break.**

## Monorepo layout

```
packages/core     @scanner/core    Pure engine: indicators, signals, backtest, metrics (no IO)
packages/data     @scanner/data    DuckDB cache + FMP client + ingestion flows (server-only)
packages/worker   @scanner/worker  Standalone scheduler + one-off CLI scripts
apps/web          @scanner/web     SvelteKit app (UI + API routes)
```

The pure engine is shared by both the SvelteKit server and the worker, guaranteeing the live scan
and the backtest use **identical** math.

## Prerequisites

- Node ≥ 20, pnpm ≥ 10
- An FMP API key

## Setup

```bash
cp .env.example .env          # then set FMP_API_KEY
pnpm install
pnpm db:migrate               # create the DuckDB schema
```

`.env` keys: `FMP_API_KEY`, `DUCKDB_PATH` (default `./data/scanner.duckdb`), `TZ`,
`FMP_RATE_LIMIT_PER_MIN`.

## Populate data

> **DuckDB is single-writer per file.** Run the worker scripts while the dev server is **stopped**
> (or point them at a different `DUCKDB_PATH`).

```bash
pnpm --filter @scanner/worker universe          # build the US universe from FMP
pnpm seed -- AAPL MSFT NVDA AMD TSLA            # backfill full history for specific symbols
# (or rely on the daily EOD bulk job for the whole universe)
pnpm scan:now                                    # compute & persist latest signals
pnpm job:now                                     # full pipeline: EOD update → scan → forward test
```

## Run

```bash
pnpm dev                  # SvelteKit app at http://localhost:5173
pnpm worker:dev           # scheduler (cron) — run with the web server stopped
```

The scheduler runs the daily pipeline at **17:30 ET (Mon–Fri)** and refreshes the universe weekly.

## End-to-end verification

1. `cp .env.example .env` and set `FMP_API_KEY`.
2. `pnpm install && pnpm db:migrate`
3. `pnpm --filter @scanner/worker universe`
4. `pnpm seed -- AAPL MSFT NVDA AMD TSLA AMZN GOOGL META`
5. `pnpm scan:now`
6. `pnpm dev` → open http://localhost:5173
   - **Dashboard:** stat cards + 3D sector heatmap + recent signals.
   - **Scanner:** filter signals, re-run a scan, export CSV/Excel.
   - **Screener:** filter the universe by price / market cap / volume / sector / exchange.
   - **Symbol** (`/symbol/AAPL`): candlestick + EMA/SMA overlays + signal markers.
   - **Backtest:** run single-symbol or portfolio; see metrics, equity & drawdown charts, the
     trades table, and export a multi-sheet `.xlsx`.
   - **Forward Test:** tracked positions and their live P&L.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm preview` | SvelteKit app |
| `pnpm worker:dev` / `pnpm worker:start` | scheduler process |
| `pnpm db:migrate` | apply the DuckDB schema |
| `pnpm --filter @scanner/worker universe` | build the universe from FMP |
| `pnpm seed -- <SYMBOLS…>` | backfill full history for symbols |
| `pnpm scan:now` | compute & persist signals |
| `pnpm job:now` | run the full daily pipeline once |
| `pnpm test` | run unit + integration tests (Vitest) |
| `pnpm check` | typecheck every package (tsc + svelte-check) |
| `pnpm --filter @scanner/web test:e2e` | Playwright smoke test |

## Testing

- **Unit (core):** indicators, signal detection, the backtest engine and metrics are proven against
  hand-computed fixtures.
- **Integration (data):** an in-memory DuckDB exercises ingestion, the screener and the scan flow;
  the FMP client is tested with a mocked `fetch` (rate-limiter, retry/429, mapping).
- **E2E:** a Playwright smoke test loads every page and runs a backtest.

```bash
pnpm test          # Vitest (core + data)
pnpm check         # types across the workspace
```

## FMP endpoints used (stable API)

Base `https://financialmodelingprep.com/stable`, auth via `?apikey=`.

- `company-screener` — universe construction
- `historical-price-eod/full` — per-symbol daily history backfill
- `eod-bulk?date=YYYY-MM-DD` — daily all-symbols EOD (CSV, ~10s cooldown)
- `quote?symbol=…` — batch quotes for forward testing
- `available-sectors` / `available-exchanges` / `available-industries`

## Deployment

Build the app with `adapter-node` (`pnpm build` → `node apps/web/build`). Run the worker
separately (`node` via `tsx`, or compiled) under a process manager, pointed at the same
`DUCKDB_PATH`. Remember the single-writer constraint: only one process should write the database.
