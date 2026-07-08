import { getConnection } from './connection.js';
import { SCHEMA_STATEMENTS } from './schema.js';
import { loadDotenv } from '../env.js';

/** Apply the schema idempotently. Safe to run on every boot. */
export async function migrate(): Promise<void> {
	const conn = await getConnection();
	for (const stmt of SCHEMA_STATEMENTS) {
		await conn.run(stmt);
	}
}

// CLI entry: `tsx src/db/migrate.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
	loadDotenv();
	migrate()
		.then(() => {
			console.log('[migrate] schema applied');
			process.exit(0);
		})
		.catch((err) => {
			console.error('[migrate] failed:', err);
			process.exit(1);
		});
}
