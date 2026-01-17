// Shared constants for uk-commute-coverage tools
const STANDARD_ZOOM = 10;
const TILE_VERSION = '42';
const ROUTE_SAMPLE_COUNT = 150;
const COLOR_TOLERANCE = 10;
// Use local proxy on localhost to avoid CORS, direct URL in production
const TILE_API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
	? '/api/tiles/gbof_{mno}_raster_bng2'
	: 'https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2';

// Attach to browser global for classic script usage
if (typeof window !== 'undefined') {
	window.UK_MOBILE_COVERAGE_CONSTANTS = window.UK_MOBILE_COVERAGE_CONSTANTS || {};
	window.UK_MOBILE_COVERAGE_CONSTANTS.STANDARD_ZOOM = window.UK_MOBILE_COVERAGE_CONSTANTS.STANDARD_ZOOM || STANDARD_ZOOM;
	window.UK_MOBILE_COVERAGE_CONSTANTS.TILE_VERSION = window.UK_MOBILE_COVERAGE_CONSTANTS.TILE_VERSION || TILE_VERSION;
	window.UK_MOBILE_COVERAGE_CONSTANTS.TILE_API_BASE = window.UK_MOBILE_COVERAGE_CONSTANTS.TILE_API_BASE || TILE_API_BASE;
	window.UK_MOBILE_COVERAGE_CONSTANTS.ROUTE_SAMPLE_COUNT = window.UK_MOBILE_COVERAGE_CONSTANTS.ROUTE_SAMPLE_COUNT || ROUTE_SAMPLE_COUNT;
	window.UK_MOBILE_COVERAGE_CONSTANTS.COLOR_TOLERANCE = window.UK_MOBILE_COVERAGE_CONSTANTS.COLOR_TOLERANCE || COLOR_TOLERANCE;
}

// CommonJS export for Node tests
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { STANDARD_ZOOM, TILE_VERSION, TILE_API_BASE, ROUTE_SAMPLE_COUNT, COLOR_TOLERANCE };
}
