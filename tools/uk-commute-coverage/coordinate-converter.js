/**
 * Coordinate Conversion Module
 * Converts between WGS84 (lat/lon) and British National Grid (BNG) coordinates
 * Also handles conversion to tile coordinates and pixel positions
 */
import { STANDARD_ZOOM } from './constants.js';
let proj4;
async function initProj4() {
    if (proj4)
        return;
    if (typeof window !== 'undefined' && window.proj4) {
        proj4 = window.proj4;
    }
    else {
        try {
            // Use dynamic import for Node.js test environment
            const proj4Module = await import('proj4');
            proj4 = proj4Module.default;
        }
        catch {
            throw new Error('proj4 library is required. Please install it or include it from a CDN.');
        }
    }
    if (proj4 && !proj4.defs('EPSG:27700')) {
        proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs');
    }
}
/**
 * Resolution array for each zoom level (meters per pixel)
 * Based on 1km tiles at zoom level 10 (tile span = 1000m)
 * Resolution = tileSpan / TILE_SIZE = 1000 / 256 = 3.90625 at Z10
 * Z0 resolution = 3.90625 * 2^10 = 4000
 */
export const RESOLUTIONS = [
    4000, 2000, 1000, 500, 250, 125, 62.5, 31.25, 15.625, 7.8125, 3.90625, 1.953125
];
export const TILE_SIZE = 256;
// MBNL/Ofcom grid origin
const ORIGIN_X = -183000;
const ORIGIN_Y = -122000;
export const DEFAULT_ZOOM = STANDARD_ZOOM;
/**
 * Convert WGS84 (lat/lon) to British National Grid (BNG)
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns {easting, northing}
 */
export async function latLonToBng(lat, lon) {
    await initProj4();
    if (!proj4) {
        throw new Error('proj4 library is not loaded.');
    }
    const numLat = Number(lat);
    const numLon = Number(lon);
    if (isNaN(numLat) || isNaN(numLon)) {
        return { easting: NaN, northing: NaN };
    }
    const [easting, northing] = proj4('EPSG:4326', 'EPSG:27700', [numLon, numLat]);
    return {
        easting: typeof easting === 'number' ? easting : NaN,
        northing: typeof northing === 'number' ? northing : NaN
    };
}
/**
 * Convert BNG to tile coordinates at a given zoom level
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, z}
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
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, pixelX, pixelY, z}
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
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, z}
 */
export async function latLonToTile(lat, lon, zoom = DEFAULT_ZOOM) {
    const { easting, northing } = await latLonToBng(lat, lon);
    return bngToTile(easting, northing, zoom);
}
/**
 * Convert lat/lon to pixel position within a tile
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, pixelX, pixelY, z}
 */
export async function latLonToPixelInTile(lat, lon, zoom = DEFAULT_ZOOM) {
    const { easting, northing } = await latLonToBng(lat, lon);
    return bngToPixelInTile(easting, northing, zoom);
}
/**
 * Convert tile coordinates to BNG bounding box
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @param zoom - Zoom level
 * @returns {west, south, east, north} in BNG
 */
export function tileToBngBounds(tileX, tileY, zoom = DEFAULT_ZOOM) {
    const resolution = RESOLUTIONS[zoom];
    const tileSpan = resolution * TILE_SIZE;
    const west = tileX * tileSpan + ORIGIN_X;
    const south = tileY * tileSpan + ORIGIN_Y;
    const east = (tileX + 1) * tileSpan + ORIGIN_X;
    const north = (tileY + 1) * tileSpan + ORIGIN_Y;
    return { west, south, east, north };
}
/**
 * Convert BNG to WGS84 (lat/lon)
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @returns {lat, lon}
 */
export async function bngToLatLon(easting, northing) {
    await initProj4();
    if (!proj4) {
        throw new Error('proj4 library is not loaded.');
    }
    const numEasting = Number(easting);
    const numNorthing = Number(northing);
    if (isNaN(numEasting) || isNaN(numNorthing)) {
        return { lat: NaN, lon: NaN };
    }
    const [lon, lat] = proj4('EPSG:27700', 'EPSG:4326', [numEasting, numNorthing]);
    return {
        lat: typeof lat === 'number' ? lat : NaN,
        lon: typeof lon === 'number' ? lon : NaN
    };
}
/**
 * Convert tile coordinates to WGS84 bounding box
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @param zoom - Zoom level
 * @returns {west, south, east, north} in Lat/Lon
 */
export async function tileToWgs84Bounds(tileX, tileY, zoom = DEFAULT_ZOOM) {
    const bngBounds = tileToBngBounds(tileX, tileY, zoom);
    const sw = await bngToLatLon(bngBounds.west, bngBounds.south);
    const ne = await bngToLatLon(bngBounds.east, bngBounds.north);
    return {
        south: sw.lat,
        west: sw.lon,
        north: ne.lat,
        east: ne.lon
    };
}
//# sourceMappingURL=coordinate-converter.js.map