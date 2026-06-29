import { z } from 'zod';

export const scanQuerySchema = z.object({
	date: z.string().optional(),
	direction: z.enum(['LONG', 'SHORT']).optional(),
	sector: z.string().optional(),
	freshOnly: z.coerce.boolean().optional(),
	limit: z.coerce.number().int().min(1).max(5000).default(200),
	offset: z.coerce.number().int().min(0).default(0)
});

export type ScanQueryInput = z.infer<typeof scanQuerySchema>;
