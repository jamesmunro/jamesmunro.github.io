import type { BngCoordinate, TileCoordinate, PixelInTile, BngBounds, Wgs84Bounds } from '../../types/coverage.js';
/**
 * Resolution array for each zoom level (meters per pixel)
 * Based on 1km tiles at zoom level 10 (tile span = 1000m)
 * Resolution = tileSpan / TILE_SIZE = 1000 / 256 = 3.90625 at Z10
 * Z0 resolution = 3.90625 * 2^10 = 4000
 */
export declare const RESOLUTIONS: number[];
export declare const TILE_SIZE = 256;
export declare const DEFAULT_ZOOM = 10;
/**
 * Convert WGS84 (lat/lon) to British National Grid (BNG)
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns {easting, northing}
 */
export declare function latLonToBng(lat: number, lon: number): Promise<BngCoordinate>;
/**
 * Convert BNG to tile coordinates at a given zoom level
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, z}
 */
export declare function bngToTile(easting: number, northing: number, zoom?: number): TileCoordinate;
/**
 * Convert BNG to pixel position within a tile
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, pixelX, pixelY, z}
 */
export declare function bngToPixelInTile(easting: number, northing: number, zoom?: number): PixelInTile;
/**
 * Convert lat/lon to tile coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, z}
 */
export declare function latLonToTile(lat: number, lon: number, zoom?: number): Promise<TileCoordinate>;
/**
 * Convert lat/lon to pixel position within a tile
 * @param lat - Latitude
 * @param lon - Longitude
 * @param zoom - Zoom level (0-11)
 * @returns {tileX, tileY, pixelX, pixelY, z}
 */
export declare function latLonToPixelInTile(lat: number, lon: number, zoom?: number): Promise<PixelInTile>;
/**
 * Convert tile coordinates to BNG bounding box
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @param zoom - Zoom level
 * @returns {west, south, east, north} in BNG
 */
export declare function tileToBngBounds(tileX: number, tileY: number, zoom?: number): BngBounds;
/**
 * Convert BNG to WGS84 (lat/lon)
 * @param easting - BNG easting
 * @param northing - BNG northing
 * @returns {lat, lon}
 */
export declare function bngToLatLon(easting: number, northing: number): Promise<{
    lat: number;
    lon: number;
}>;
/**
 * Convert tile coordinates to WGS84 bounding box
 * @param tileX - Tile X coordinate
 * @param tileY - Tile Y coordinate
 * @param zoom - Zoom level
 * @returns {west, south, east, north} in Lat/Lon
 */
export declare function tileToWgs84Bounds(tileX: number, tileY: number, zoom?: number): Promise<Wgs84Bounds>;
