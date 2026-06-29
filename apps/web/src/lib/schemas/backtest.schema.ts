import { z } from 'zod';

export const takeProfitSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('R'), value: z.number().min(0) }),
	z.object({ type: z.literal('PCT'), value: z.number().min(0) })
]);

export const exitModelSchema = z.object({
	stopLossPct: z.number().min(0).max(1).optional(),
	takeProfit: takeProfitSchema.optional(),
	maxHoldBars: z.number().int().min(1).max(2000).optional(),
	exitOnOppositeSignal: z.boolean().optional(),
	exitOnStackBreak: z.boolean().optional()
});

export const signalConfigSchema = z.object({
	invert: z.boolean().default(false),
	closesRequired: z.number().int().min(1).max(50).default(5),
	source: z.enum(['close', 'adjClose']).default('close')
});

export const backtestConfigSchema = z.object({
	signal: signalConfigSchema.default({ invert: false, closesRequired: 5, source: 'close' }),
	exit: exitModelSchema.default({
		stopLossPct: 0.08,
		takeProfit: { type: 'R', value: 2 },
		maxHoldBars: 20,
		exitOnOppositeSignal: true,
		exitOnStackBreak: true
	}),
	initialEquity: z.number().positive().default(10_000),
	positionSizePct: z.number().min(0.01).max(1).default(1),
	feesPct: z.number().min(0).max(0.1).default(0.0005),
	slippagePct: z.number().min(0).max(0.1).default(0),
	riskFreeRate: z.number().min(0).max(1).default(0)
});

export const singleBacktestSchema = z.object({
	symbol: z.string().min(1).max(12),
	from: z.string().optional(),
	to: z.string().optional(),
	config: backtestConfigSchema
});

export const portfolioBacktestSchema = z.object({
	symbols: z.array(z.string().min(1).max(12)).max(500).optional(),
	maxSymbols: z.number().int().min(1).max(500).default(50),
	config: backtestConfigSchema
});

export type BacktestConfigInput = z.infer<typeof backtestConfigSchema>;
export type SingleBacktestInput = z.infer<typeof singleBacktestSchema>;
export type PortfolioBacktestInput = z.infer<typeof portfolioBacktestSchema>;
