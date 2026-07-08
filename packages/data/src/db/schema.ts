// DuckDB schema. Embedded as a string (rather than a .sql asset) so it bundles
// cleanly under both tsx and the SvelteKit/Vite build. Applied idempotently by
// `migrate()`.

export const SCHEMA_STATEMENTS: string[] = [
	`CREATE TABLE IF NOT EXISTS ohlcv_daily (
		symbol     VARCHAR NOT NULL,
		date       DATE    NOT NULL,
		open       DOUBLE,
		high       DOUBLE,
		low        DOUBLE,
		close      DOUBLE,
		adj_close  DOUBLE,
		volume     BIGINT,
		PRIMARY KEY (symbol, date)
	)`,

	`CREATE TABLE IF NOT EXISTS symbols (
		symbol      VARCHAR PRIMARY KEY,
		name        VARCHAR,
		exchange    VARCHAR,
		sector      VARCHAR,
		industry    VARCHAR,
		market_cap  DOUBLE,
		price       DOUBLE,
		volume      BIGINT,
		is_etf      BOOLEAN,
		is_active   BOOLEAN,
		updated_at  TIMESTAMP DEFAULT now()
	)`,

	`CREATE TABLE IF NOT EXISTS signals (
		symbol      VARCHAR NOT NULL,
		signal_date DATE    NOT NULL,
		direction   VARCHAR NOT NULL,
		fresh       BOOLEAN,
		close       DOUBLE,
		ema5 DOUBLE, ema9 DOUBLE, ema21 DOUBLE,
		sma50 DOUBLE, sma100 DOUBLE, sma200 DOUBLE,
		created_at  TIMESTAMP DEFAULT now(),
		PRIMARY KEY (symbol, signal_date, direction)
	)`,

	`CREATE TABLE IF NOT EXISTS backtest_runs (
		id          VARCHAR PRIMARY KEY,
		created_at  TIMESTAMP DEFAULT now(),
		scope       VARCHAR,
		symbol      VARCHAR,
		from_date   DATE,
		to_date     DATE,
		config_json VARCHAR,
		metrics_json VARCHAR,
		status      VARCHAR
	)`,

	`CREATE TABLE IF NOT EXISTS backtest_trades (
		run_id      VARCHAR NOT NULL,
		symbol      VARCHAR,
		direction   VARCHAR,
		entry_date  DATE,
		entry_price DOUBLE,
		exit_date   DATE,
		exit_price  DOUBLE,
		exit_reason VARCHAR,
		bars_held   INTEGER,
		pnl         DOUBLE,
		pnl_pct     DOUBLE,
		r_multiple  DOUBLE
	)`,

	`CREATE TABLE IF NOT EXISTS backtest_equity (
		run_id   VARCHAR NOT NULL,
		date     DATE,
		equity   DOUBLE,
		drawdown DOUBLE
	)`,

	`CREATE TABLE IF NOT EXISTS forward_test_positions (
		symbol        VARCHAR NOT NULL,
		entry_date    DATE    NOT NULL,
		direction     VARCHAR NOT NULL,
		entry_price   DOUBLE,
		current_date  DATE,
		current_price DOUBLE,
		exit_date     DATE,
		exit_price    DOUBLE,
		exit_reason   VARCHAR,
		pnl_pct       DOUBLE,
		status        VARCHAR,
		config_json   VARCHAR,
		created_at    TIMESTAMP DEFAULT now(),
		PRIMARY KEY (symbol, entry_date, direction)
	)`,

	`CREATE TABLE IF NOT EXISTS sync_state (
		key        VARCHAR PRIMARY KEY,
		value      VARCHAR,
		updated_at TIMESTAMP DEFAULT now()
	)`,

	`CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol ON ohlcv_daily(symbol)`,
	`CREATE INDEX IF NOT EXISTS idx_signals_date ON signals(signal_date)`,
	`CREATE INDEX IF NOT EXISTS idx_bt_trades_run ON backtest_trades(run_id)`,
	`CREATE INDEX IF NOT EXISTS idx_bt_equity_run ON backtest_equity(run_id)`
];
