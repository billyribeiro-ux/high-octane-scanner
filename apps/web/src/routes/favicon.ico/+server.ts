import type { RequestHandler } from '@sveltejs/kit';

// Serve the brand mark for the browser's default /favicon.ico probe so it
// doesn't 404. Prerendered to a static asset at build time.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<rect width="256" height="256" rx="56" fill="#3b82f6"/>
<path d="M140 28 64 150h46l-18 78 100-126h-50z" fill="#fff"/>
</svg>`;

export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(SVG, {
		headers: {
			'content-type': 'image/svg+xml',
			'cache-control': 'public, max-age=86400'
		}
	});
