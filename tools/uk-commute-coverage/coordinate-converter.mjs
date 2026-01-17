/**
 * Coordinate Conversion Module
 * Converts between WGS84 (lat/lon) and British National Grid (BNG) coordinates
 * Also handles conversion to tile coordinates and pixel positions
 */
import { STANDARD_ZOOM } from './constants.mjs';

let proj4;

async function initProj4() {
  if (proj4) return;

  if (typeof window !== 'undefined' && window.proj4) {
    proj4 = window.proj4;
  } else {
    try {
      // Use dynamic import for Node.js test environment
      const proj4Module = await import('proj4');
      proj4 = proj4Module.default;
    } catch (e) {
      throw new Error('proj4 library is required. Please install it or include it from a CDN.');
    }
  }

  if (proj4 && !proj4.defs('EPSG:27700')) {
    proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs');
  }
}


/**
 * Resolution array for each zoom level (meters per pixel)
 */
export const RESOLUTIONS = [5734.4, 2867.2, 1433.6, 716.8, 358.4, 179.2, 89.6, 44.8, 22.4, 11.2, 5.6, 2.8];
export const TILE_SIZE = 256;
const ORIGIN_X = 0;
const ORIGIN_Y = 0;

export const DEFAULT_ZOOM = STANDARD_ZOOM;

/**
 * Convert WGS84 (lat/lon) to British National Grid (BNG)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} {easting, northing}
 */
export async function latLonToBng(lat, lon) {
  await initProj4();
  if (!proj4) {
    throw new Error('proj4 library is not loaded.');
  }
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
export function bngToTile(easting, northing, zoom = DEFAULT_ZOOM) {
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
export function bngToPixelInTile(easting, northing, zoom = DEFAULT_ZOOM) {
  if (zoom < 0 || zoom > 11) {
    throw new Error(`Zoom level must be between 0 and 11, got ${zoom}`);
  }
  const resolution = RESOLUTIONS[zoom];
  const tileSpan = resolution * TILE_SIZE;
  const tileX = Math.floor((easting - ORIGIN_X) / tileSpan);
  const tileY = Math.floor((northing - ORIGIN_Y) / tileSpan);
  const pixelX = Math.floor(((easting - ORIGIN_X) % tileSpan) / resolution);
  const pixelY = TILE_SIZE - 1 - Math.floor(((northing - ORIGIN_Y) % tileSpan) / resolution);
  return { tileX, tileY, pixelX, pixelY, z: zoom };
}

/**
 * Convert lat/lon to tile coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Promise<Object>} {tileX, tileY, z}
 */
export async function latLonToTile(lat, lon, zoom = DEFAULT_ZOOM) {
  const { easting, northing } = await latLonToBng(lat, lon);
  return bngToTile(easting, northing, zoom);
}

/**
 * Convert lat/lon to pixel position within a tile
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} zoom - Zoom level (0-11)
 * @returns {Promise<Object>} {tileX, tileY, pixelX, pixelY, z}
 */
export async function latLonToPixelInTile(lat, lon, zoom = DEFAULT_ZOOM) {
  const { easting, northing } = await latLonToBng(lat, lon);
  return bngToPixelInTile(easting, northing, zoom);
}
