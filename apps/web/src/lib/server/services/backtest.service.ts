import { randomUUID } from 'node:crypto';
import {
	computeIndicatorSeries,
	runBacktest,
	runPortfolioBacktest,
	type BacktestConfig,
	type Metrics,
	type SymbolSeries
} from '@scanner/core';
import { backtestRepo, ohlcvRepo, symbolsRepo } from '@scanner/data';
import { ensureReady } from '$lib/server/db';
import * as runner from '$lib/server/jobs/runner';
import type { SingleBacktestInput, PortfolioBacktestInput } from '$lib/schemas/backtest.schema';

export interface PerSymbolResult {
	symbol: string;
	metrics: Metrics;
	trades: number;
}

/** Synchronous single-symbol backtest; persists the run. */
export async function runSingleBacktest(input: SingleBacktestInput) {
	await ensureReady();
	const sym = input.symbol.toUpperCase();
	const bars = await ohlcvRepo.getBars(sym, { from: input.from, to: input.to });
	const config = input.config as BacktestConfig;
	const series = computeIndicatorSeries(bars, config.signal.source);
	const result = runBacktest(bars, series, config, sym);
	const runId = randomUUID();
	await backtestRepo.saveBacktest({
		id: runId,
		scope: 'single',
		symbol: sym,
		fromDate: bars[0]?.date ?? null,
		toDate: bars[bars.length - 1]?.date ?? null,
		config,
		result
	});
	return { runId, result, bars: bars.length };
}

/** Kick off a portfolio backtest as a background job; returns its run id. */
export function startPortfolioBacktest(input: PortfolioBacktestInput): string {
	const runId = randomUUID();
	runner.createJob(runId);
	void runPortfolioJob(runId, input);
	return runId;
}

async function runPortfolioJob(runId: string, input: PortfolioBacktestInput): Promise<void> {
	try {
		await ensureReady();
		const config = input.config as BacktestConfig;
		let symbols = input.symbols?.map((s) => s.toUpperCase());
		if (!symbols || symbols.length === 0) {
			const screened = await symbolsRepo.screen({ limit: input.maxSymbols });
			symbols = screened.rows.map((r) => r.symbol);
		}
		symbols = symbols.slice(0, input.maxSymbols);

		runner.setProgress(runId, { phase: 'loading', done: 0, total: symbols.length });
		const seriesList: SymbolSeries[] = [];
		const perSymbol: PerSymbolResult[] = [];
		for (let i = 0; i < symbols.length; i++) {
			const sym = symbols[i] as string;
			const bars = await ohlcvRepo.getBars(sym);
			if (bars.length >= 200) {
				const series = computeIndicatorSeries(bars, config.signal.source);
				seriesList.push({ symbol: sym, bars, series });
				const r = runBacktest(bars, series, config, sym);
				perSymbol.push({ symbol: sym, metrics: r.metrics, trades: r.trades.length });
			}
			runner.setProgress(runId, { phase: 'loading', done: i + 1, total: symbols.length });
		}

		runner.setProgress(runId, { phase: 'computing', done: symbols.length, total: symbols.length });
		const result = runPortfolioBacktest(seriesList, config);
		await backtestRepo.saveBacktest({
			id: runId,
			scope: 'portfolio',
			symbol: null,
			config,
			result
		});

		perSymbol.sort((a, b) => b.metrics.totalReturnPct - a.metrics.totalReturnPct);
		runner.finishJob(runId, {
			runId,
			metrics: result.metrics,
			equityCurve: result.equityCurve,
			trades: result.trades,
			perSymbol,
			symbolsTested: seriesList.length
		});
	} catch (err) {
		runner.failJob(runId, String(err));
	}
}

export async function getBacktestRun(runId: string) {
	await ensureReady();
	const run = await backtestRepo.getRun(runId);
	if (!run) return null;
	const [trades, equity] = await Promise.all([
		backtestRepo.getTrades(runId),
		backtestRepo.getEquity(runId)
	]);
	return { run, trades, equity };
}

export async function listBacktestRuns() {
	await ensureReady();
	return backtestRepo.listRuns();
}
