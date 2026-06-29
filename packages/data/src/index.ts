// @scanner/data — DuckDB cache + FMP client (server-only).

export const DATA_VERSION = '0.1.0';

// Env / config
export { getDataEnv, loadDotenv, findRepoRoot, type DataEnv } from './env.js';

// Database
export {
	getConnection,
	createMemoryConnection,
	__setConnectionForTests
} from './db/connection.js';
export { migrate } from './db/migrate.js';
export {
	exec,
	queryRows,
	queryOne,
	queryScalar,
	insertRows,
	type ParamValue,
	type QueryParams
} from './db/query.js';

// Repositories
export * as ohlcvRepo from './repositories/ohlcv.repo.js';
export * as symbolsRepo from './repositories/symbols.repo.js';
export * as signalsRepo from './repositories/signals.repo.js';
export * as backtestRepo from './repositories/backtest.repo.js';
export * as forwardRepo from './repositories/forward.repo.js';
export * as syncStateRepo from './repositories/syncState.repo.js';
export { SYNC_KEYS } from './repositories/syncState.repo.js';

export type { SymbolRow, ScreenerFilters } from './repositories/symbols.repo.js';
export type {
	SignalListItem,
	PersistableSignal,
	LatestSignalsQuery
} from './repositories/signals.repo.js';
export type { ForwardPosition } from './repositories/forward.repo.js';
export type { BacktestRunRecord, SaveRunInput } from './repositories/backtest.repo.js';

// Flows
export { runScan, type ScanOptions, type ScanResult } from './flows/runScan.js';

// FMP client + ingestion flows (added in M3)
export * from './fmp/index.js';
export * from './flows/index.js';
