/**
 * Tile-Based Coverage Data Adapter
 * Fetches coverage data from Ofcom tile API and extracts coverage colors
 */
import { TILE_API_BASE, TILE_VERSION, STANDARD_ZOOM, COLOR_TOLERANCE } from './constants.mjs';
import { latLonToPixelInTile, tileToWgs84Bounds } from './coordinate-converter.mjs';

// Mobile Network Operator mapping
// ... (rest of imports/constants)
const MNO_MAP = {
  mno1: 'Vodafone',
  mno2: 'O2',
  mno3: 'EE',
  mno4: 'Three'
};

const MNO_IDS = ['mno1', 'mno2', 'mno3', 'mno4'];

/**
 * Tile-based coverage adapter using Ofcom tile API
 */
export class TileCoverageAdapter {
  constructor() {
    this.tileCache = this.loadTileCacheFromStorage();
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
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Coverage data with networks
   */
  async getCoverageFromCoordinates(lat, lon) {
    try {
      const pixelInfo = await latLonToPixelInTile(lat, lon, STANDARD_ZOOM);

      // Fetch tiles for all 4 operators
      const coverageData = {
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
            error: error.message
          };
        }
      }

      return coverageData;
    } catch (error) {
      throw new Error(`Failed to get coverage from coordinates: ${error.message}`);
    }
  }

  /**
   * Get tile URL and bounds for a coordinate
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} mnoId - MNO parameter
   * @returns {Promise<Object>} {url, bounds}
   */
  async getTileInfo(lat, lon, mnoId = 'mno1') {
    const pixelInfo = await latLonToPixelInTile(lat, lon, STANDARD_ZOOM);
    const bounds = await tileToWgs84Bounds(pixelInfo.tileX, pixelInfo.tileY, STANDARD_ZOOM);
    const url = this.getTileUrl(mnoId, pixelInfo.tileX, pixelInfo.tileY);
    return { url, bounds, tileX: pixelInfo.tileX, tileY: pixelInfo.tileY };
  }

  /**
   * Get tile URL for given parameters
   */
  getTileUrl(mnoId, tileX, tileY) {
    return `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`;
  }

  /**
   * Fetch a tile PNG from the API
   * @param {string} mnoId - MNO parameter (mno1, mno2, mno3, mno4)
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Promise<Blob>} Tile PNG blob
   */
  async fetchTile(mnoId, tileX, tileY) {
    const cacheKey = `${mnoId}-${STANDARD_ZOOM}-${tileX}-${tileY}-v${TILE_VERSION}`;

    if (this.tileCache[cacheKey] instanceof Blob) {
      return this.tileCache[cacheKey];
    }

    if (this.tileCache[cacheKey] && this.tileCache[cacheKey].timestamp) {
      const blob = await this.loadTileFromIndexedDB(cacheKey);
      if (blob) {
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
      this.tileCache[cacheKey] = blob;
      this.saveTileCacheToStorage(cacheKey, blob);
      return blob;
    } catch (error) {
      throw new Error(`Failed to fetch tile ${mnoId}/${STANDARD_ZOOM}/${tileX}/${tileY}: ${error.message}`);
    }
  }

  /**
   * Extract color from a tile at specific pixel coordinates
   * @param {Blob} tileBlob - Tile PNG blob
   * @param {number} pixelX - Pixel X coordinate
   * @param {number} pixelY - Pixel Y coordinate
   * @returns {Promise<Object>} {r, g, b, hex}
   */
  async extractColorFromTile(tileBlob, pixelX, pixelY) {
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
          const color = {
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

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  mapColorToCoverageLevel(hex, tolerance = COLOR_TOLERANCE) {
    const extractedRgb = this.hexToRgb(hex);
    if (!extractedRgb) return null;
    let bestMatch = null;
    let bestDistance = Infinity;
    for (const [level, colorHex] of Object.entries(this.colorMap)) {
      const mappedRgb = this.hexToRgb(colorHex);
      if (!mappedRgb) continue;
      const distance = this.colorDistance(extractedRgb, mappedRgb);
      if (distance <= tolerance && distance < bestDistance) {
        bestMatch = parseInt(level);
        bestDistance = distance;
      }
    }
    return bestMatch;
  }

  getCoverageDescription(level) {
    const descriptions = {
      4: 'Good outdoor and in-home', 3: 'Good outdoor, variable in-home',
      2: 'Good outdoor', 1: 'Variable outdoor', 0: 'Poor to none outdoor',
      null: 'Unknown'
    };
    return descriptions[level] || descriptions[null];
  }

  loadTileCacheFromStorage() {
    try {
      const cached = localStorage.getItem('tile-cache-index');
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to load tile cache from storage:', error);
      return {};
    }
  }

  saveTileCacheToStorage(key, blob) {
    try {
      const index = this.loadTileCacheFromStorage();
      index[key] = { timestamp: Date.now(), size: blob.size, version: TILE_VERSION };
      localStorage.setItem('tile-cache-index', JSON.stringify(index));
      if (window.indexedDB) this.saveTileToIndexedDB(key, blob);
    } catch (error) {
      console.warn('Failed to save tile cache:', error);
    }
  }

  loadTileFromIndexedDB(key) {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) { resolve(null); return; }
        const request = indexedDB.open('tile-cache', 1);
        request.onerror = () => resolve(null);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['tiles'], 'readonly');
          const store = transaction.objectStore('tiles');
          const query = store.get(key);
          query.onsuccess = () => resolve(query.result && query.result.blob ? query.result.blob : null);
          query.onerror = () => resolve(null);
        };
      } catch (error) {
        console.warn('Error loading tile from IndexedDB:', error);
        resolve(null);
      }
    });
  }

  saveTileToIndexedDB(key, blob) {
    try {
      const request = indexedDB.open('tile-cache', 1);
      request.onerror = () => console.warn('Failed to open IndexedDB');
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['tiles'], 'readwrite');
        const store = transaction.objectStore('tiles');
        store.put({ key, blob });
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.warn('IndexedDB not available:', error);
    }
  }

  clearCache() {
    this.tileCache = {};
    try {
      localStorage.removeItem('tile-cache-index');
      if (window.indexedDB) {
        const request = indexedDB.deleteDatabase('tile-cache');
        request.onsuccess = () => console.log('Tile cache cleared');
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}
