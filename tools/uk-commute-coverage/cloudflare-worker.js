/**
 * Cloudflare Worker CORS Proxy for Ofcom Tiles
 *
 * This worker proxies tile requests to ofcom.europa.uk.com and adds CORS headers,
 * enabling cross-origin access from the UK Commute Coverage tool on GitHub Pages.
 *
 * Deployment:
 * 1. Go to https://dash.cloudflare.com/ → Workers & Pages
 * 2. Create or edit the "uk-commute-coverage" worker
 * 3. Paste this code and deploy
 *
 * The worker handles requests like:
 *   https://uk-commute-coverage.jamesjulianmunro.workers.dev/tiles/gbof_mno1_raster_bng2/8/123/456.png
 *
 * And proxies them to:
 *   https://ofcom.europa.uk.com/tiles/gbof_mno1_raster_bng2/8/123/456.png
 */

const OFCOM_BASE_URL = 'https://ofcom.europa.uk.com';

export default {
	async fetch(request) {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Only proxy /tiles/* paths
		if (!url.pathname.startsWith('/tiles/')) {
			return new Response('Not Found', { status: 404 });
		}

		// Build the target URL
		const targetUrl = `${OFCOM_BASE_URL}${url.pathname}${url.search}`;

		// Fetch from Ofcom
		const response = await fetch(targetUrl, {
			method: request.method,
			headers: {
				'User-Agent': 'UK-Commute-Coverage-Proxy/1.0',
			},
		});

		// Create new response with CORS headers
		const newHeaders = new Headers(response.headers);
		newHeaders.set('Access-Control-Allow-Origin', '*');
		newHeaders.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders,
		});
	},
};
