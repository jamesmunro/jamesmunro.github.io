import type { CoverageData, TileInfo, CoverageLevel, MnoId, RgbColor, ExtractedColor } from '../../types/coverage.js';
/** Tile cache statistics */
interface TileStats {
    tilesFetched: number;
    tilesFromCache: number;
}
/**
 * Tile-based coverage adapter using Ofcom tile API
 */
export declare class TileCoverageAdapter {
    private tileCache;
    stats: TileStats;
    private colorMap;
    constructor();
    /**
     * Get coverage data for coordinates (lat/lon)
     * @param lat - Latitude
     * @param lon - Longitude
     * @returns Coverage data with networks
     */
    getCoverageFromCoordinates(lat: number, lon: number): Promise<CoverageData>;
    /**
     * Get tile URL and bounds for a coordinate
     * @param lat - Latitude
     * @param lon - Longitude
     * @param mnoId - MNO parameter
     * @returns {url, bounds}
     */
    getTileInfo(lat: number, lon: number, mnoId?: MnoId | string): Promise<TileInfo>;
    /**
     * Get tile URL for given parameters
     */
    getTileUrl(mnoId: string, tileX: number, tileY: number): string;
    /**
     * Fetch a tile PNG from the API
     * @param mnoId - MNO parameter (mno1, mno2, mno3, mno4)
     * @param tileX - Tile X coordinate
     * @param tileY - Tile Y coordinate
     * @returns Tile PNG blob
     */
    fetchTile(mnoId: MnoId, tileX: number, tileY: number): Promise<Blob>;
    /**
     * Extract color from a tile at specific pixel coordinates
     * @param tileBlob - Tile PNG blob
     * @param pixelX - Pixel X coordinate
     * @param pixelY - Pixel Y coordinate
     * @returns {r, g, b, hex}
     */
    extractColorFromTile(tileBlob: Blob, pixelX: number, pixelY: number): Promise<ExtractedColor>;
    rgbToHex(r: number, g: number, b: number): string;
    hexToRgb(hex: string): RgbColor | null;
    colorDistance(color1: RgbColor, color2: RgbColor): number;
    mapColorToCoverageLevel(hex: string, tolerance?: number): CoverageLevel;
    getCoverageDescription(level: CoverageLevel): string;
    clearCache(): Promise<void>;
    /**
     * Get the count of tiles stored in IndexedDB
     */
    getStoredTileCount(): Promise<number>;
}
export {};
