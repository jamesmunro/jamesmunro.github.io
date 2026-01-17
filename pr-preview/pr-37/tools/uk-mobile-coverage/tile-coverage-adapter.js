/**
 * Tile-Based Coverage Data Adapter
 * Fetches coverage data from Ofcom tile API and extracts coverage colors
 */

// Use var for browser compatibility (allows redeclaration on reload)
var TILE_API_BASE = 'https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2';
var TILE_VERSION = '42';
var STANDARD_ZOOM = 10;

// Mobile Network Operator mapping
var MNO_MAP = {
  mno1: 'Vodafone',
  mno2: 'O2',
  mno3: 'EE',
  mno4: 'Three'
};

var MNO_IDS = ['mno1', 'mno2', 'mno3', 'mno4'];

/**
 * Tile-based coverage adapter using Ofcom tile API
 */
class TileCoverageAdapter {
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
      // Convert lat/lon to pixel position in tile
      if (!window.latLonToPixelInTile) {
        throw new Error('Coordinate converter not loaded');
      }

      const pixelInfo = window.latLonToPixelInTile(lat, lon, STANDARD_ZOOM);

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
   * Fetch a tile PNG from the API
   * @param {string} mnoId - MNO parameter (mno1, mno2, mno3, mno4)
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Promise<Blob>} Tile PNG blob
   */
  async fetchTile(mnoId, tileX, tileY) {
    const cacheKey = `${mnoId}-${STANDARD_ZOOM}-${tileX}-${tileY}-v${TILE_VERSION}`;

    // Check in-memory cache first (actual Blob objects)
    if (this.tileCache[cacheKey] instanceof Blob) {
      return this.tileCache[cacheKey];
    }

    // If we have metadata but no blob, try to load from IndexedDB
    if (this.tileCache[cacheKey] && this.tileCache[cacheKey].timestamp) {
      const blob = await this.loadTileFromIndexedDB(cacheKey);
      if (blob) {
        this.tileCache[cacheKey] = blob; // Update in-memory cache
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

      // Cache in memory and localStorage
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

          // Clamp coordinates to image bounds
          const x = Math.max(0, Math.min(pixelX, img.width - 1));
          const y = Math.max(0, Math.min(pixelY, img.height - 1));

          const imageData = ctx.getImageData(x, y, 1, 1);
          const data = imageData.data;

          const color = {
            r: data[0],
            g: data[1],
            b: data[2],
            a: data[3],
            hex: this.rgbToHex(data[0], data[1], data[2])
          };

          resolve(color);
        };

        img.onerror = () => {
          reject(new Error('Failed to load tile image'));
        };

        // Convert blob to data URL
        const url = URL.createObjectURL(tileBlob);
        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert RGB to hex color string
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculate Euclidean distance between two RGB colors
   */
  colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Map a color to a coverage level
   * @param {string} hex - Hex color
   * @param {number} tolerance - RGB tolerance (default 10)
   * @returns {number|null} Coverage level (0-4) or null if no match
   */
  mapColorToCoverageLevel(hex, tolerance = 10) {
    const extractedRgb = this.hexToRgb(hex);
    if (!extractedRgb) {
      return null;
    }

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

  /**
   * Get human-readable coverage description
   */
  getCoverageDescription(level) {
    const descriptions = {
      4: 'Good outdoor and in-home',
      3: 'Good outdoor, variable in-home',
      2: 'Good outdoor',
      1: 'Variable outdoor',
      0: 'Poor to none outdoor',
      null: 'Unknown'
    };
    return descriptions[level] || descriptions[null];
  }

  /**
   * Load tile cache from localStorage
   */
  loadTileCacheFromStorage() {
    try {
      const cached = localStorage.getItem('tile-cache-index');
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to load tile cache from storage:', error);
      return {};
    }
  }

  /**
   * Save tile cache index to localStorage
   * Note: Actual blob data is stored separately or handled by browser
   */
  saveTileCacheToStorage(key, blob) {
    try {
      // Store cache keys in localStorage for reference
      const index = this.loadTileCacheFromStorage();
      index[key] = {
        timestamp: Date.now(),
        size: blob.size,
        version: TILE_VERSION
      };
      localStorage.setItem('tile-cache-index', JSON.stringify(index));

      // Store actual blob in IndexedDB for larger storage capacity
      if (window.indexedDB) {
        this.saveTileToIndexedDB(key, blob);
      }
    } catch (error) {
      console.warn('Failed to save tile cache:', error);
    }
  }

  /**
   * Load tile blob from IndexedDB by cache key
   * @param {string} key - Cache key (e.g., "mno1-10-0-0-v42")
   * @returns {Promise<Blob|null>} Blob if found, null otherwise
   */
  loadTileFromIndexedDB(key) {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          resolve(null);
          return;
        }

        const request = indexedDB.open('tile-cache', 1);

        request.onerror = () => {
          resolve(null);
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['tiles'], 'readonly');
          const store = transaction.objectStore('tiles');
          const query = store.get(key);

          query.onsuccess = () => {
            const result = query.result;
            resolve(result && result.blob ? result.blob : null);
          };

          query.onerror = () => {
            resolve(null);
          };
        };
      } catch (error) {
        console.warn('Error loading tile from IndexedDB:', error);
        resolve(null);
      }
    });
  }

  /**
   * Save tile blob to IndexedDB for better storage
   */
  saveTileToIndexedDB(key, blob) {
    try {
      const request = indexedDB.open('tile-cache', 1);

      request.onerror = () => {
        console.warn('Failed to open IndexedDB');
      };

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

  /**
   * Clear tile cache
   */
  clearCache() {
    this.tileCache = {};
    try {
      localStorage.removeItem('tile-cache-index');
      if (window.indexedDB) {
        const request = indexedDB.deleteDatabase('tile-cache');
        request.onsuccess = () => {
          console.log('Tile cache cleared');
        };
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TileCoverageAdapter };
}

// Export to global scope for browser
if (typeof window !== 'undefined') {
  window.TileCoverageAdapter = TileCoverageAdapter;
}
