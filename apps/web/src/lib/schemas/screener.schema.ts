import { z } from 'zod';

export const screenerSchema = z.object({
	priceMin: z.number().min(0).optional(),
	priceMax: z.number().min(0).optional(),
	marketCapMin: z.number().min(0).optional(),
	marketCapMax: z.number().min(0).optional(),
	volumeMin: z.number().min(0).optional(),
	sectors: z.array(z.string()).optional(),
	exchanges: z.array(z.string()).optional(),
	isEtf: z.boolean().optional(),
	search: z.string().max(64).optional(),
	sort: z
		.enum(['symbol', 'name', 'marketCap', 'price', 'volume', 'sector', 'exchange'])
		.optional(),
	dir: z.enum(['asc', 'desc']).optional(),
	limit: z.number().int().min(1).max(5000).default(100),
	offset: z.number().int().min(0).default(0)
});

export type ScreenerInput = z.infer<typeof screenerSchema>;
