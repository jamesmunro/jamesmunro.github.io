/**
 * Coordinate Conversion Module
 * Converts between WGS84 (lat/lon) and British National Grid (BNG) coordinates
 * Also handles conversion to tile coordinates and pixel positions
 */

// Use proj4 from browser CDN or Node.js require
let proj4;

if (typeof window !== 'undefined' && window.proj4) {
  // Browser environment: use proj4 from CDN
  proj4 = window.proj4;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment: require proj4
  try {
    proj4 = require('proj4');
  } catch (e) {
    // proj4 not available in this environment
  }
}

/**
 * Resolution array for each zoom level (meters per pixel)
 */
const RESOLUTIONS = [5734.4, 2867.2, 1433.6, 716.8, 358.4, 179.2, 89.6, 44.8, 22.4, 11.2, 5.6, 2.8];
const TILE_SIZE = 256;
const ORIGIN_X = 0;
const ORIGIN_Y = 0;
const STANDARD_ZOOM = 10;

/**
 * Define BNG projection for proj4
 */
function initProj4() {
  if (proj4 && !proj4.defs('EPSG:27700')) {
    proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs');
  }
}

/**
 * Convert WGS84 (lat/lon) to British National Grid (BNG)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} {easting, northing}
 */
function latLonToBng(lat, lon) {
  if (!proj4) {
    throw new Error('proj4 library is required for coordinate conversion. Ensure it is loaded in the browser.');
  }

  initProj4();

  const [easting, northing] = proj4('EPSG:4326', 'EPSG:27700', [lon, lat]);
  return { easting, northing };
}

/**
 * Convert BNG to tile coordinates at a given zoom level
 * @param {number} easting - BNG easting
 * @param {number} northing - BNG northing
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Object} {tileX, tileY, z}
 */
function bngToTile(easting, northing, zoom = STANDARD_ZOOM) {
  if (zoom < 0 || zoom > 11) {
    throw new Error(`Zoom level must be between 0 and 11, got ${zoom}`);
  }

  const resolution = RESOLUTIONS[zoom];
  const tileSpan = resolution * TILE_SIZE;

  const tileX = Math.floor((easting - ORIGIN_X) / tileSpan);
  const tileY = Math.floor((northing - ORIGIN_Y) / tileSpan);

  return { tileX, tileY, z: zoom };
}

/**
 * Convert BNG to pixel position within a tile
 * @param {number} easting - BNG easting
 * @param {number} northing - BNG northing
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Object} {tileX, tileY, pixelX, pixelY, z}
 */
function bngToPixelInTile(easting, northing, zoom = STANDARD_ZOOM) {
  if (zoom < 0 || zoom > 11) {
    throw new Error(`Zoom level must be between 0 and 11, got ${zoom}`);
  }

  const resolution = RESOLUTIONS[zoom];
  const tileSpan = resolution * TILE_SIZE;

  const tileX = Math.floor((easting - ORIGIN_X) / tileSpan);
  const tileY = Math.floor((northing - ORIGIN_Y) / tileSpan);

  // Pixel offset within the tile
  const pixelX = Math.floor(((easting - ORIGIN_X) % tileSpan) / resolution);
  // pixelY is inverted because PNG pixel 0 is at top, but BNG northing increases upward
  const pixelY = TILE_SIZE - 1 - Math.floor(((northing - ORIGIN_Y) % tileSpan) / resolution);

  return { tileX, tileY, pixelX, pixelY, z: zoom };
}

/**
 * Convert lat/lon to tile coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Object} {tileX, tileY, z}
 */
function latLonToTile(lat, lon, zoom = STANDARD_ZOOM) {
  const { easting, northing } = latLonToBng(lat, lon);
  return bngToTile(easting, northing, zoom);
}

/**
 * Convert lat/lon to pixel position within a tile
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Object} {tileX, tileY, pixelX, pixelY, z}
 */
function latLonToPixelInTile(lat, lon, zoom = STANDARD_ZOOM) {
  const { easting, northing } = latLonToBng(lat, lon);
  return bngToPixelInTile(easting, northing, zoom);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    latLonToBng,
    bngToTile,
    bngToPixelInTile,
    latLonToTile,
    latLonToPixelInTile,
    STANDARD_ZOOM,
    RESOLUTIONS,
    TILE_SIZE
  };
}
