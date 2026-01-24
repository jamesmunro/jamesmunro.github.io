// Shared constants for uk-commute-coverage tools
export const STANDARD_ZOOM = 8;
export const TILE_VERSION = '42';
export const ROUTE_SAMPLE_COUNT = 500;
export const COLOR_TOLERANCE = 10;
// Use local proxy on localhost to avoid CORS, direct URL in production
export const TILE_API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? '/api/tiles/gbof_{mno}_raster_bng2'
    : 'https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2';
//# sourceMappingURL=constants.js.map