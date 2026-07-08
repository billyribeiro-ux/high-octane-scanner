import { error } from '@sveltejs/kit';
import type { z } from 'zod';

function format(err: z.ZodError): string {
	return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/** Parse a JSON request body against a schema; throws a 400 on failure. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}
	const result = schema.safeParse(body);
	if (!result.success) throw error(400, format(result.error));
	return result.data;
}

/** Parse URL search params against a schema; throws a 400 on failure. */
export function parseQuery<T>(url: URL, schema: z.ZodType<T>): T {
	const result = schema.safeParse(Object.fromEntries(url.searchParams));
	if (!result.success) throw error(400, format(result.error));
	return result.data;
}
