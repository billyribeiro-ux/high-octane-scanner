import ExcelJS from 'exceljs';
import { signalsRepo, backtestRepo } from '@scanner/data';
import { ensureReady } from '$lib/server/db';

type Cell = string | number | null | undefined;

function csvCell(v: Cell): string {
	if (v == null) return '';
	const s = String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
	const lines = [headers.map(csvCell).join(',')];
	for (const row of rows) lines.push(row.map(csvCell).join(','));
	return lines.join('\n');
}

// --- Signals ---

const SIGNAL_HEADERS = [
	'Symbol',
	'Date',
	'Direction',
	'Fresh',
	'Close',
	'EMA5',
	'EMA9',
	'EMA21',
	'SMA50',
	'SMA100',
	'SMA200',
	'Name',
	'Sector',
	'Exchange',
	'MarketCap'
];

async function signalRows(date?: string): Promise<Cell[][]> {
	const { rows } = await signalsRepo.latest({ date, limit: 5000 });
	return rows.map((s) => [
		s.symbol,
		s.signalDate,
		s.direction,
		s.fresh ? 'yes' : 'no',
		s.close,
		s.ema5,
		s.ema9,
		s.ema21,
		s.sma50,
		s.sma100,
		s.sma200,
		s.name,
		s.sector,
		s.exchange,
		s.marketCap
	]);
}

export async function buildSignalsCsv(date?: string): Promise<string> {
	await ensureReady();
	return toCsv(SIGNAL_HEADERS, await signalRows(date));
}

export async function buildSignalsXlsx(date?: string): Promise<Buffer> {
	await ensureReady();
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet('Signals');
	ws.addRow(SIGNAL_HEADERS);
	for (const row of await signalRows(date)) ws.addRow(row);
	styleSheet(ws, SIGNAL_HEADERS.length);
	return toBuffer(wb);
}

// --- Backtest ---

const TRADE_HEADERS = [
	'Symbol',
	'Direction',
	'Entry Date',
	'Entry Price',
	'Exit Date',
	'Exit Price',
	'Exit Reason',
	'Bars Held',
	'P&L',
	'P&L %',
	'R Multiple'
];

export async function buildBacktestCsv(runId: string): Promise<string> {
	await ensureReady();
	const trades = await backtestRepo.getTrades(runId);
	const rows: Cell[][] = trades.map((t) => [
		t.symbol,
		t.direction,
		t.entryDate,
		t.entryPrice,
		t.exitDate,
		t.exitPrice,
		t.exitReason,
		t.barsHeld,
		t.pnl,
		t.pnlPct,
		t.rMultiple
	]);
	return toCsv(TRADE_HEADERS, rows);
}

export async function buildBacktestXlsx(runId: string): Promise<Buffer> {
	await ensureReady();
	const run = await backtestRepo.getRun(runId);
	const [trades, equity] = await Promise.all([
		backtestRepo.getTrades(runId),
		backtestRepo.getEquity(runId)
	]);
	const wb = new ExcelJS.Workbook();

	// Metrics sheet
	const metricsWs = wb.addWorksheet('Metrics');
	metricsWs.addRow(['Metric', 'Value']);
	if (run) {
		const m = run.metrics;
		const entries: Array<[string, Cell]> = [
			['Scope', run.scope],
			['Symbol', run.symbol ?? '(portfolio)'],
			['Total Trades', m.totalTrades],
			['Win Rate', m.winRate],
			['Profit Factor', m.profitFactor],
			['Expectancy', m.expectancy],
			['Avg Win', m.avgWin],
			['Avg Loss', m.avgLoss],
			['Max Drawdown', m.maxDrawdown],
			['Sharpe', m.sharpe],
			['Sortino', m.sortino],
			['CAGR', m.cagr],
			['Exposure', m.exposure],
			['Total Return', m.totalReturnPct],
			['Final Equity', m.finalEquity]
		];
		for (const e of entries) metricsWs.addRow(e);
	}
	styleSheet(metricsWs, 2);

	// Trades sheet
	const tradesWs = wb.addWorksheet('Trades');
	tradesWs.addRow(TRADE_HEADERS);
	for (const t of trades) {
		tradesWs.addRow([
			t.symbol,
			t.direction,
			t.entryDate,
			t.entryPrice,
			t.exitDate,
			t.exitPrice,
			t.exitReason,
			t.barsHeld,
			t.pnl,
			t.pnlPct,
			t.rMultiple
		]);
	}
	styleSheet(tradesWs, TRADE_HEADERS.length);

	// Equity curve sheet
	const equityWs = wb.addWorksheet('Equity Curve');
	equityWs.addRow(['Date', 'Equity', 'Drawdown']);
	for (const p of equity) equityWs.addRow([p.date, p.equity, p.drawdown]);
	styleSheet(equityWs, 3);

	return toBuffer(wb);
}

function styleSheet(ws: ExcelJS.Worksheet, columns: number): void {
	const header = ws.getRow(1);
	header.font = { bold: true };
	header.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FF1F2937' }
	};
	header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	ws.views = [{ state: 'frozen', ySplit: 1 }];
	ws.columns.forEach((c) => {
		c.width = 14;
	});
	if (ws.rowCount > 1) {
		ws.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: columns }
		};
	}
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf as ArrayBuffer);
}
