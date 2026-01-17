/**
 * Unit tests for tile-based coverage implementation
 * Tests coordinate conversion, pixel extraction, and color mapping
 */

const { describe, test, before } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

// Setup minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

// Load actual modules
const {
  latLonToBng,
  bngToTile,
  bngToPixelInTile,
  latLonToTile,
  latLonToPixelInTile,
  RESOLUTIONS,
  TILE_SIZE
} = require('./coordinate-converter.js');

const {
  rgbToHex,
  hexToRgb,
  colorDistance,
  mapColorToCoverageLevel,
  COVERAGE_COLOR_MAP
} = require('./pixel-extractor.js');

const { TileCoverageAdapter } = require('./tile-coverage-adapter.js');

// Test coordinate converter with real proj4
describe('Coordinate Converter', () => {
  describe('latLonToBng', () => {
    test('converts London coordinates to BNG', () => {
      // London: 51.5074, -0.1276
      // Expected BNG: approximately 530000, 180000
      const result = latLonToBng(51.5074, -0.1276);

      assert.ok(result.easting > 520000 && result.easting < 540000,
        `Easting ${result.easting} should be around 530000`);
      assert.ok(result.northing > 170000 && result.northing < 190000,
        `Northing ${result.northing} should be around 180000`);
    });

    test('converts Edinburgh coordinates to BNG', () => {
      // Edinburgh: 55.9533, -3.1883
      // Expected BNG: approximately 325000, 673000
      const result = latLonToBng(55.9533, -3.1883);

      assert.ok(result.easting > 315000 && result.easting < 335000,
        `Easting ${result.easting} should be around 325000`);
      assert.ok(result.northing > 663000 && result.northing < 683000,
        `Northing ${result.northing} should be around 673000`);
    });

    test('converts Cardiff coordinates to BNG', () => {
      // Cardiff: 51.4816, -3.1791
      // Expected BNG: approximately 318000, 177000
      const result = latLonToBng(51.4816, -3.1791);

      assert.ok(result.easting > 308000 && result.easting < 328000,
        `Easting ${result.easting} should be around 318000`);
      assert.ok(result.northing > 167000 && result.northing < 187000,
        `Northing ${result.northing} should be around 177000`);
    });
  });

  describe('bngToTile', () => {
    test('converts BNG to tile coordinates at zoom 10', () => {
      // London: approximately 530000, 180000
      const result = bngToTile(530000, 180000, 10);

      assert.ok(result.tileX >= 0, 'Tile X should be non-negative');
      assert.ok(result.tileY >= 0, 'Tile Y should be non-negative');
      assert.strictEqual(result.z, 10, 'Zoom level should be 10');
    });

    test('tile coordinates increase with BNG coordinates', () => {
      const result1 = bngToTile(100000, 100000, 10);
      const result2 = bngToTile(500000, 500000, 10);

      assert.ok(result2.tileX > result1.tileX, 'Higher easting should give higher tileX');
      assert.ok(result2.tileY > result1.tileY, 'Higher northing should give higher tileY');
    });

    test('throws error for invalid zoom level', () => {
      assert.throws(() => bngToTile(530000, 180000, -1), /Zoom level must be between 0 and 11/);
      assert.throws(() => bngToTile(530000, 180000, 12), /Zoom level must be between 0 and 11/);
    });
  });

  describe('bngToPixelInTile', () => {
    test('converts BNG to pixel position within tile', () => {
      const result = bngToPixelInTile(530000, 180000, 10);

      assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE,
        `Pixel X ${result.pixelX} should be within tile (0-${TILE_SIZE - 1})`);
      assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE,
        `Pixel Y ${result.pixelY} should be within tile (0-${TILE_SIZE - 1})`);
      assert.strictEqual(result.z, 10, 'Zoom level should be 10');
    });

    test('pixel position is within tile bounds for various UK locations', () => {
      const locations = [
        { easting: 100000, northing: 100000 },   // SW England
        { easting: 530000, northing: 180000 },   // London
        { easting: 325000, northing: 673000 },   // Edinburgh
        { easting: 0, northing: 0 },             // Origin
        { easting: 700000, northing: 1200000 },  // NE Scotland
      ];

      locations.forEach(({ easting, northing }) => {
        const result = bngToPixelInTile(easting, northing, 10);
        assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE,
          `Pixel X out of bounds for E=${easting}, N=${northing}`);
        assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE,
          `Pixel Y out of bounds for E=${easting}, N=${northing}`);
      });
    });

    test('throws error for invalid zoom level', () => {
      assert.throws(() => bngToPixelInTile(530000, 180000, -1), /Zoom level must be between 0 and 11/);
      assert.throws(() => bngToPixelInTile(530000, 180000, 12), /Zoom level must be between 0 and 11/);
    });
  });

  describe('latLonToTile', () => {
    test('converts lat/lon to tile coordinates', () => {
      const result = latLonToTile(51.5074, -0.1276, 10);

      assert.ok(result.tileX >= 0, 'Tile X should be non-negative');
      assert.ok(result.tileY >= 0, 'Tile Y should be non-negative');
      assert.strictEqual(result.z, 10);
    });
  });

  describe('latLonToPixelInTile', () => {
    test('converts lat/lon to pixel position', () => {
      const result = latLonToPixelInTile(51.5074, -0.1276, 10);

      assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE);
      assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE);
      assert.ok(result.tileX >= 0);
      assert.ok(result.tileY >= 0);
    });
  });
});

// Test pixel extractor functions
describe('Pixel Extractor', () => {
  describe('rgbToHex', () => {
    test('converts RGB to hex correctly', () => {
      assert.strictEqual(rgbToHex(125, 32, 147), '#7d2093');
      assert.strictEqual(rgbToHex(255, 255, 255), '#ffffff');
      assert.strictEqual(rgbToHex(0, 0, 0), '#000000');
      assert.strictEqual(rgbToHex(255, 0, 0), '#ff0000');
      assert.strictEqual(rgbToHex(0, 255, 0), '#00ff00');
      assert.strictEqual(rgbToHex(0, 0, 255), '#0000ff');
    });

    test('pads single digit hex values', () => {
      assert.strictEqual(rgbToHex(0, 0, 0), '#000000');
      assert.strictEqual(rgbToHex(1, 2, 3), '#010203');
      assert.strictEqual(rgbToHex(15, 15, 15), '#0f0f0f');
    });
  });

  describe('hexToRgb', () => {
    test('converts hex to RGB correctly', () => {
      const result = hexToRgb('#7d2093');
      assert.strictEqual(result.r, 125);
      assert.strictEqual(result.g, 32);
      assert.strictEqual(result.b, 147);
    });

    test('handles hex without hash', () => {
      const result = hexToRgb('7d2093');
      assert.strictEqual(result.r, 125);
      assert.strictEqual(result.g, 32);
      assert.strictEqual(result.b, 147);
    });

    test('returns null for invalid hex', () => {
      assert.strictEqual(hexToRgb('invalid'), null);
      assert.strictEqual(hexToRgb('#gg0000'), null);
      assert.strictEqual(hexToRgb('#fff'), null); // Short form not supported
      assert.strictEqual(hexToRgb(''), null);
    });
  });

  describe('colorDistance', () => {
    test('returns 0 for identical colors', () => {
      const color = { r: 100, g: 150, b: 200 };
      assert.strictEqual(colorDistance(color, color), 0);
    });

    test('calculates correct distance', () => {
      const color1 = { r: 0, g: 0, b: 0 };
      const color2 = { r: 255, g: 255, b: 255 };
      // Distance = sqrt(255^2 + 255^2 + 255^2) = sqrt(195075) ≈ 441.67
      const distance = colorDistance(color1, color2);
      assert.ok(Math.abs(distance - 441.67) < 1);
    });

    test('is symmetric', () => {
      const color1 = { r: 125, g: 32, b: 147 };
      const color2 = { r: 205, g: 123, b: 228 };

      const dist1 = colorDistance(color1, color2);
      const dist2 = colorDistance(color2, color1);

      assert.strictEqual(dist1, dist2);
    });
  });

  describe('mapColorToCoverageLevel', () => {
    test('maps exact coverage colors', () => {
      assert.strictEqual(mapColorToCoverageLevel('#7d2093', COVERAGE_COLOR_MAP), 4);
      assert.strictEqual(mapColorToCoverageLevel('#cd7be4', COVERAGE_COLOR_MAP), 3);
      assert.strictEqual(mapColorToCoverageLevel('#0081b3', COVERAGE_COLOR_MAP), 2);
      assert.strictEqual(mapColorToCoverageLevel('#83e5f6', COVERAGE_COLOR_MAP), 1);
      assert.strictEqual(mapColorToCoverageLevel('#d4d4d4', COVERAGE_COLOR_MAP), 0);
    });

    test('returns null for color outside tolerance', () => {
      assert.strictEqual(mapColorToCoverageLevel('#ffffff', COVERAGE_COLOR_MAP, 5), null);
      assert.strictEqual(mapColorToCoverageLevel('#000000', COVERAGE_COLOR_MAP, 5), null);
    });

    test('respects tolerance parameter', () => {
      // Exact match should work with any tolerance
      assert.strictEqual(mapColorToCoverageLevel('#7d2093', COVERAGE_COLOR_MAP, 0), 4);
      assert.strictEqual(mapColorToCoverageLevel('#7d2093', COVERAGE_COLOR_MAP, 100), 4);
    });

    test('returns null for invalid hex', () => {
      assert.strictEqual(mapColorToCoverageLevel('invalid', COVERAGE_COLOR_MAP), null);
    });
  });
});

// Test TileCoverageAdapter methods that don't require network
describe('TileCoverageAdapter', () => {
  let adapter;

  before(() => {
    // Mock localStorage
    global.localStorage = {
      data: {},
      getItem(key) { return this.data[key] || null; },
      setItem(key, value) { this.data[key] = value; },
      removeItem(key) { delete this.data[key]; }
    };

    // Mock indexedDB
    global.indexedDB = null;

    // Mock latLonToPixelInTile on window for the adapter
    global.window.latLonToPixelInTile = latLonToPixelInTile;

    adapter = new TileCoverageAdapter();
  });

  describe('rgbToHex', () => {
    test('converts RGB to hex', () => {
      assert.strictEqual(adapter.rgbToHex(125, 32, 147), '#7d2093');
    });
  });

  describe('hexToRgb', () => {
    test('converts hex to RGB', () => {
      const result = adapter.hexToRgb('#7d2093');
      assert.deepStrictEqual(result, { r: 125, g: 32, b: 147 });
    });

    test('returns null for invalid hex', () => {
      assert.strictEqual(adapter.hexToRgb('invalid'), null);
    });
  });

  describe('colorDistance', () => {
    test('calculates distance correctly', () => {
      const color1 = { r: 0, g: 0, b: 0 };
      const color2 = { r: 3, g: 4, b: 0 };
      // Distance = sqrt(3^2 + 4^2) = 5
      assert.strictEqual(adapter.colorDistance(color1, color2), 5);
    });
  });

  describe('mapColorToCoverageLevel', () => {
    test('maps coverage colors to levels', () => {
      assert.strictEqual(adapter.mapColorToCoverageLevel('#7d2093'), 4);
      assert.strictEqual(adapter.mapColorToCoverageLevel('#cd7be4'), 3);
      assert.strictEqual(adapter.mapColorToCoverageLevel('#0081b3'), 2);
      assert.strictEqual(adapter.mapColorToCoverageLevel('#83e5f6'), 1);
      assert.strictEqual(adapter.mapColorToCoverageLevel('#d4d4d4'), 0);
    });

    test('returns null for unrecognized colors', () => {
      assert.strictEqual(adapter.mapColorToCoverageLevel('#ffffff'), null);
    });
  });

  describe('getCoverageDescription', () => {
    test('returns correct descriptions', () => {
      assert.strictEqual(adapter.getCoverageDescription(4), 'Good outdoor and in-home');
      assert.strictEqual(adapter.getCoverageDescription(3), 'Good outdoor, variable in-home');
      assert.strictEqual(adapter.getCoverageDescription(2), 'Good outdoor');
      assert.strictEqual(adapter.getCoverageDescription(1), 'Variable outdoor');
      assert.strictEqual(adapter.getCoverageDescription(0), 'Poor to none outdoor');
      assert.strictEqual(adapter.getCoverageDescription(null), 'Unknown');
      assert.strictEqual(adapter.getCoverageDescription(undefined), 'Unknown');
    });
  });
});

// Test tile URL construction
describe('Tile URL Construction', () => {
  const TILE_API_BASE = 'https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2';
  const TILE_VERSION = '42';
  const STANDARD_ZOOM = 10;

  test('constructs correct tile URL', () => {
    const mnoId = 'mno1';
    const tileX = 713;
    const tileY = 302;

    const url = `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`;

    assert.strictEqual(
      url,
      'https://ofcom.europa.uk.com/tiles/gbof_mno1_raster_bng2/10/713/302.png?v=42'
    );
  });

  test('constructs URLs for all MNOs', () => {
    const mnoIds = ['mno1', 'mno2', 'mno3', 'mno4'];

    for (const mnoId of mnoIds) {
      const url = `${TILE_API_BASE.replace('{mno}', mnoId)}/10/0/0.png?v=${TILE_VERSION}`;
      assert.ok(url.includes(mnoId), `URL should include MNO ${mnoId}`);
      assert.ok(url.includes('/10/'), 'URL should include zoom level');
    }
  });
});

// Test cache key construction
describe('Cache Key Construction', () => {
  test('creates unique cache keys', () => {
    const TILE_VERSION = '42';
    const STANDARD_ZOOM = 10;

    const key1 = `mno1-${STANDARD_ZOOM}-713-302-v${TILE_VERSION}`;
    const key2 = `mno2-${STANDARD_ZOOM}-713-302-v${TILE_VERSION}`;
    const key3 = `mno1-${STANDARD_ZOOM}-714-302-v${TILE_VERSION}`;

    assert.notStrictEqual(key1, key2, 'Different MNOs should have different keys');
    assert.notStrictEqual(key1, key3, 'Different tiles should have different keys');
  });
});

// Test module exports
describe('Module Exports', () => {
  test('TileCoverageAdapter is exported', () => {
    assert.ok(TileCoverageAdapter, 'TileCoverageAdapter should be exported');
    assert.strictEqual(typeof TileCoverageAdapter, 'function', 'Should be a class/function');
  });

  test('coordinate converter functions are exported', () => {
    assert.strictEqual(typeof latLonToBng, 'function');
    assert.strictEqual(typeof bngToTile, 'function');
    assert.strictEqual(typeof bngToPixelInTile, 'function');
    assert.strictEqual(typeof latLonToTile, 'function');
    assert.strictEqual(typeof latLonToPixelInTile, 'function');
  });

  test('pixel extractor functions are exported', () => {
    assert.strictEqual(typeof rgbToHex, 'function');
    assert.strictEqual(typeof hexToRgb, 'function');
    assert.strictEqual(typeof colorDistance, 'function');
    assert.strictEqual(typeof mapColorToCoverageLevel, 'function');
    assert.ok(COVERAGE_COLOR_MAP, 'COVERAGE_COLOR_MAP should be exported');
  });
});
