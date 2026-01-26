// Shared constants for uk-commute-coverage tools
// =============================================================================
// Tile System
// =============================================================================
export const STANDARD_ZOOM = 8;
export const TILE_VERSION = '42';
export const ROUTE_SAMPLE_COUNT = 500;
export const COLOR_TOLERANCE = 10;
// Use local proxy on localhost to avoid CORS, Cloudflare Worker proxy in production
export const TILE_API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? '/api/tiles/gbof_{mno}_raster_bng2' // Local: Eleventy dev server proxy
    : 'https://uk-commute-coverage.dirac.workers.dev/tiles/gbof_{mno}_raster_bng2'; // Prod: CF Worker
// =============================================================================
// IndexedDB Configuration
// =============================================================================
export const INDEXED_DB = {
    DATABASE_NAME: 'tile-cache',
    DATABASE_VERSION: 2, // Bumped for schema change (added settings store)
    TILES_STORE: 'tiles',
    SETTINGS_STORE: 'settings',
};
// Settings keys (for IndexedDB settings store)
export const SETTINGS_KEYS = {
    ROUTE_START: 'route-start',
    ROUTE_END: 'route-end',
    GOOGLE_MAPS_API_KEY: 'google-maps-api-key',
    ROUTE_PROFILE: 'route-profile',
    TILE_NETWORK: 'tile-network',
};
// =============================================================================
// Coverage Level Colors (Ofcom tile color scheme)
// =============================================================================
export const COVERAGE_COLORS = {
    4: '#7d2093', // Good outdoor and in-home (purple)
    3: '#cd7be4', // Good outdoor, variable in-home (light purple)
    2: '#0081b3', // Good outdoor (blue)
    1: '#83e5f6', // Variable outdoor (cyan)
    0: '#d4d4d4', // Poor to none outdoor (gray)
};
// =============================================================================
// Network Operator Colors (for charts)
// =============================================================================
export const NETWORK_COLORS = {
    EE: '#009a9a',
    Vodafone: '#e60000',
    O2: '#0019a5',
    Three: '#333333',
};
export const MNO_MAP = {
    mno1: 'Vodafone',
    mno2: 'O2',
    mno3: 'EE',
    mno4: 'Three',
};
export const MNO_IDS = ['mno1', 'mno2', 'mno3', 'mno4'];
export const NETWORKS = ['EE', 'Vodafone', 'O2', 'Three'];
//# sourceMappingURL=constants.js.map