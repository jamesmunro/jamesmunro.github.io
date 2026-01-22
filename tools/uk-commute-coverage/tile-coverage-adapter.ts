/**
 * Tile-Based Coverage Data Adapter
 * Fetches coverage data from Ofcom tile API and extracts coverage colors
 */
import { TILE_API_BASE, TILE_VERSION, STANDARD_ZOOM, COLOR_TOLERANCE } from './constants.js';
import { latLonToPixelInTile, tileToWgs84Bounds } from './coordinate-converter.js';
import type { CoverageData, NetworkCoverageResult, TileInfo, CoverageLevel, MnoId, OperatorName, TileCacheEntry, RgbColor, ExtractedColor } from '../../types/coverage.js';

// Mobile Network Operator mapping
const MNO_MAP: Record<MnoId, OperatorName> = {
  mno1: 'Vodafone',
  mno2: 'O2',
  mno3: 'EE',
  mno4: 'Three'
};

const MNO_IDS: MnoId[] = ['mno1', 'mno2', 'mno3', 'mno4'];

/** Tile cache statistics */
interface TileStats {
  tilesFetched: number;
  tilesFromCache: number;
}

/** IndexedDB tile record */
interface TileRecord {
  key: string;
  blob: Blob;
}

/**
 * Tile-based coverage adapter using Ofcom tile API
 */
export class TileCoverageAdapter {
  private tileCache: Record<string, Blob | TileCacheEntry>;
  public stats: TileStats;
  private colorMap: Record<number, string>;

  constructor() {
    this.tileCache = this.loadTileCacheFromStorage();
    this.stats = {
      tilesFetched: 0,
      tilesFromCache: 0
    };
    this.colorMap = {
      4: '#7d2093', // Good outdoor and in-home
      3: '#cd7be4', // Good outdoor, variable in-home
      2: '#0081b3', // Good outdoor
      1: '#83e5f6', // Variable outdoor
      0: '#d4d4d4'  // Poor to none outdoor
    };
  }

  /**
   * Get coverage data for coordinates (lat/lon)
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Coverage data with networks
   */
  async getCoverageFromCoordinates(lat: number, lon: number): Promise<CoverageData> {
    try {
      const pixelInfo = await latLonToPixelInTile(lat, lon, STANDARD_ZOOM);

      // Fetch tiles for all 4 operators
      const coverageData: CoverageData = {
        latitude: lat,
        longitude: lon,
        networks: {}
      };

      for (const mnoId of MNO_IDS) {
        const operatorName = MNO_MAP[mnoId];

        try {
          const tile = await this.fetchTile(mnoId, pixelInfo.tileX, pixelInfo.tileY);
          const color = await this.extractColorFromTile(tile, pixelInfo.pixelX, pixelInfo.pixelY);
          const level = this.mapColorToCoverageLevel(color.hex);

          coverageData.networks[operatorName] = {
            level: level,
            color: color.hex,
            description: this.getCoverageDescription(level)
          };
        } catch (error) {
          console.warn(`Failed to get ${operatorName} coverage:`, error);
          coverageData.networks[operatorName] = {
            level: null,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      return coverageData;
    } catch (error) {
      throw new Error(`Failed to get coverage from coordinates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get tile URL and bounds for a coordinate
   * @param lat - Latitude
   * @param lon - Longitude
   * @param mnoId - MNO parameter
   * @returns {url, bounds}
   */
  async getTileInfo(lat: number, lon: number, mnoId: MnoId | string = 'mno1'): Promise<TileInfo> {
    const pixelInfo = await latLonToPixelInTile(lat, lon, STANDARD_ZOOM);
    const bounds = await tileToWgs84Bounds(pixelInfo.tileX, pixelInfo.tileY, STANDARD_ZOOM);
    const url = this.getTileUrl(mnoId, pixelInfo.tileX, pixelInfo.tileY);
    return { url, bounds, tileX: pixelInfo.tileX, tileY: pixelInfo.tileY };
  }

  /**
   * Get tile URL for given parameters
   */
  getTileUrl(mnoId: string, tileX: number, tileY: number): string {
    return `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`;
  }

  /**
   * Fetch a tile PNG from the API
   * @param mnoId - MNO parameter (mno1, mno2, mno3, mno4)
   * @param tileX - Tile X coordinate
   * @param tileY - Tile Y coordinate
   * @returns Tile PNG blob
   */
  async fetchTile(mnoId: MnoId, tileX: number, tileY: number): Promise<Blob> {
    const cacheKey = `${mnoId}-${STANDARD_ZOOM}-${tileX}-${tileY}-v${TILE_VERSION}`;

    const cached = this.tileCache[cacheKey];
    if (cached instanceof Blob) {
      this.stats.tilesFromCache++;
      return cached;
    }

    if (cached && (cached as TileCacheEntry).timestamp) {
      const blob = await this.loadTileFromIndexedDB(cacheKey);
      if (blob) {
        this.stats.tilesFromCache++;
        this.tileCache[cacheKey] = blob;
        return blob;
      }
    }

    const url = `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Tile fetch failed: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      this.stats.tilesFetched++;
      this.tileCache[cacheKey] = blob;
      this.saveTileCacheToStorage(cacheKey, blob);
      return blob;
    } catch (error) {
      throw new Error(`Failed to fetch tile ${mnoId}/${STANDARD_ZOOM}/${tileX}/${tileY}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract color from a tile at specific pixel coordinates
   * @param tileBlob - Tile PNG blob
   * @param pixelX - Pixel X coordinate
   * @param pixelY - Pixel Y coordinate
   * @returns {r, g, b, hex}
   */
  async extractColorFromTile(tileBlob: Blob, pixelX: number, pixelY: number): Promise<ExtractedColor> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Could not get canvas 2D context');
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const x = Math.max(0, Math.min(pixelX, img.width - 1));
          const y = Math.max(0, Math.min(pixelY, img.height - 1));
          const imageData = ctx.getImageData(x, y, 1, 1);
          const data = imageData.data;
          const color: ExtractedColor = {
            r: data[0], g: data[1], b: data[2], a: data[3],
            hex: this.rgbToHex(data[0], data[1], data[2])
          };
          resolve(color);
        };
        img.onerror = () => reject(new Error('Failed to load tile image'));
        const url = URL.createObjectURL(tileBlob);
        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  hexToRgb(hex: string): RgbColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  colorDistance(color1: RgbColor, color2: RgbColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  mapColorToCoverageLevel(hex: string, tolerance = COLOR_TOLERANCE): CoverageLevel {
    const extractedRgb = this.hexToRgb(hex);
    if (!extractedRgb) return null;
    let bestMatch: CoverageLevel = null;
    let bestDistance = Infinity;
    for (const [level, colorHex] of Object.entries(this.colorMap)) {
      const mappedRgb = this.hexToRgb(colorHex);
      if (!mappedRgb) continue;
      const distance = this.colorDistance(extractedRgb, mappedRgb);
      if (distance <= tolerance && distance < bestDistance) {
        bestMatch = parseInt(level) as CoverageLevel;
        bestDistance = distance;
      }
    }
    return bestMatch;
  }

  getCoverageDescription(level: CoverageLevel): string {
    const descriptions: Record<number | 'null', string> = {
      4: 'Good outdoor and in-home', 3: 'Good outdoor, variable in-home',
      2: 'Good outdoor', 1: 'Variable outdoor', 0: 'Poor to none outdoor',
      null: 'Unknown'
    };
    return level !== null ? (descriptions[level] || descriptions.null) : descriptions.null;
  }

  private loadTileCacheFromStorage(): Record<string, TileCacheEntry> {
    try {
      const cached = localStorage.getItem('tile-cache-index');
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to load tile cache from storage:', error);
      return {};
    }
  }

  private saveTileCacheToStorage(key: string, blob: Blob): void {
    try {
      const index = this.loadTileCacheFromStorage();
      index[key] = { timestamp: Date.now(), size: blob.size, version: TILE_VERSION };
      localStorage.setItem('tile-cache-index', JSON.stringify(index));
      if (typeof window !== 'undefined' && window.indexedDB) this.saveTileToIndexedDB(key, blob);
    } catch (error) {
      console.warn('Failed to save tile cache:', error);
    }
  }

  private loadTileFromIndexedDB(key: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || !window.indexedDB) { resolve(null); return; }
        const request = indexedDB.open('tile-cache', 1);
        request.onerror = () => resolve(null);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['tiles'], 'readonly');
          const store = transaction.objectStore('tiles');
          const query = store.get(key);
          query.onsuccess = () => {
            const result = query.result as TileRecord | undefined;
            resolve(result && result.blob ? result.blob : null);
          };
          query.onerror = () => resolve(null);
        };
      } catch (error) {
        console.warn('Error loading tile from IndexedDB:', error);
        resolve(null);
      }
    });
  }

  private saveTileToIndexedDB(key: string, blob: Blob): void {
    try {
      const request = indexedDB.open('tile-cache', 1);
      request.onerror = () => console.warn('Failed to open IndexedDB');
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['tiles'], 'readwrite');
        const store = transaction.objectStore('tiles');
        store.put({ key, blob } as TileRecord);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.warn('IndexedDB not available:', error);
    }
  }

  clearCache(): void {
    this.tileCache = {};
    try {
      localStorage.removeItem('tile-cache-index');
      if (typeof window !== 'undefined' && window.indexedDB) {
        const request = indexedDB.deleteDatabase('tile-cache');
        request.onsuccess = () => console.log('Tile cache cleared');
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}
