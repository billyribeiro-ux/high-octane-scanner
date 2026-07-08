import { migrate } from '@scanner/data';

let ready: Promise<void> | null = null;

/** Ensure the schema exists. Memoized — runs once per server process. */
export function ensureReady(): Promise<void> {
	if (!ready) ready = migrate();
	return ready;
}
