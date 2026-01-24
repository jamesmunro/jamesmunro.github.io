import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
// Setup minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
// Load actual modules
import { latLonToBng, bngToTile, bngToPixelInTile, latLonToTile, latLonToPixelInTile, TILE_SIZE } from './coordinate-converter.js';
import { rgbToHex, hexToRgb, colorDistance, mapColorToCoverageLevel, COVERAGE_COLOR_MAP } from './pixel-extractor.js';
import { TileCoverageAdapter } from './tile-coverage-adapter.js';
import { STANDARD_ZOOM, TILE_VERSION } from './constants.js';
// Test coordinate converter with real proj4
describe('Coordinate Converter', () => {
    describe('latLonToBng', () => {
        test('converts London coordinates to BNG', async () => {
            // London: 51.5074, -0.1276
            // Expected BNG: approximately 530000, 180000
            const result = await latLonToBng(51.5074, -0.1276);
            assert.ok(result.easting > 520000 && result.easting < 540000, `Easting ${result.easting} should be around 530000`);
            assert.ok(result.northing > 170000 && result.northing < 190000, `Northing ${result.northing} should be around 180000`);
        });
        test('converts Edinburgh coordinates to BNG', async () => {
            // Edinburgh: 55.9533, -3.1883
            // Expected BNG: approximately 325000, 673000
            const result = await latLonToBng(55.9533, -3.1883);
            assert.ok(result.easting > 315000 && result.easting < 335000, `Easting ${result.easting} should be around 325000`);
            assert.ok(result.northing > 663000 && result.northing < 683000, `Northing ${result.northing} should be around 673000`);
        });
        test('converts Cardiff coordinates to BNG', async () => {
            // Cardiff: 51.4816, -3.1791
            // Expected BNG: approximately 318000, 177000
            const result = await latLonToBng(51.4816, -3.1791);
            assert.ok(result.easting > 308000 && result.easting < 328000, `Easting ${result.easting} should be around 318000`);
            assert.ok(result.northing > 167000 && result.northing < 187000, `Northing ${result.northing} should be around 177000`);
        });
    });
    describe('bngToTile', () => {
        test('converts BNG to tile coordinates at zoom 10', () => {
            // London: approximately 530000, 180000
            const result = bngToTile(530000, 180000, 10);
            assert.ok(result.tileX >= 0, 'Tile X should be non-negative');
            assert.ok(result.tileY >= 0, 'Tile Y should be non-negative');
            assert.strictEqual(result.z, 10, 'Zoom level should be 10');
            // At zoom 10: tileSpan = 716.8m, London should be around tile (739, 251)
            assert.strictEqual(result.tileX, 739);
            assert.strictEqual(result.tileY, 251);
        });
        test('converts BNG to tile coordinates at zoom 8', () => {
            // London: approximately 530000, 180000
            const result = bngToTile(530000, 180000, 8);
            assert.ok(result.tileX >= 0, 'Tile X should be non-negative');
            assert.ok(result.tileY >= 0, 'Tile Y should be non-negative');
            assert.strictEqual(result.z, 8, 'Zoom level should be 8');
            // At zoom 8: tileSpan = 2867.2m, tiles are 4x larger than zoom 10
            assert.strictEqual(result.tileX, 184);
            assert.strictEqual(result.tileY, 62);
        });
        test('tile coordinates scale correctly between zoom 8 and zoom 10', () => {
            // At zoom 8, tiles are 4x larger, so coordinates should be ~1/4
            const result10 = bngToTile(530000, 180000, 10);
            const result8 = bngToTile(530000, 180000, 8);
            // Verify the 4:1 ratio (approximately, due to grid alignment)
            const ratioX = result10.tileX / result8.tileX;
            const ratioY = result10.tileY / result8.tileY;
            assert.ok(ratioX > 3.9 && ratioX < 4.1, `X ratio should be ~4, got ${ratioX}`);
            assert.ok(ratioY > 3.9 && ratioY < 4.1, `Y ratio should be ~4, got ${ratioY}`);
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
        test('converts BNG to pixel position within tile at zoom 10', () => {
            const result = bngToPixelInTile(530000, 180000, 10);
            assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE, `Pixel X ${result.pixelX} should be within tile (0-${TILE_SIZE - 1})`);
            assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE, `Pixel Y ${result.pixelY} should be within tile (0-${TILE_SIZE - 1})`);
            assert.strictEqual(result.z, 10, 'Zoom level should be 10');
        });
        test('converts BNG to pixel position within tile at zoom 8', () => {
            const result = bngToPixelInTile(530000, 180000, 8);
            assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE, `Pixel X ${result.pixelX} should be within tile (0-${TILE_SIZE - 1})`);
            assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE, `Pixel Y ${result.pixelY} should be within tile (0-${TILE_SIZE - 1})`);
            assert.strictEqual(result.z, 8, 'Zoom level should be 8');
        });
        test('pixel position is within tile bounds for various UK locations at both zooms', () => {
            const locations = [
                { easting: 100000, northing: 100000 }, // SW England
                { easting: 530000, northing: 180000 }, // London
                { easting: 325000, northing: 673000 }, // Edinburgh
                { easting: 0, northing: 0 }, // Origin
                { easting: 700000, northing: 1200000 }, // NE Scotland
            ];
            for (const zoom of [8, 10]) {
                locations.forEach(({ easting, northing }) => {
                    const result = bngToPixelInTile(easting, northing, zoom);
                    assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE, `Pixel X out of bounds for E=${easting}, N=${northing} at zoom ${zoom}`);
                    assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE, `Pixel Y out of bounds for E=${easting}, N=${northing} at zoom ${zoom}`);
                });
            }
        });
        test('throws error for invalid zoom level', () => {
            assert.throws(() => bngToPixelInTile(530000, 180000, -1), /Zoom level must be between 0 and 11/);
            assert.throws(() => bngToPixelInTile(530000, 180000, 12), /Zoom level must be between 0 and 11/);
        });
    });
    describe('latLonToTile', () => {
        test('converts lat/lon to tile coordinates at zoom 10', async () => {
            const result = await latLonToTile(51.5074, -0.1276, 10);
            assert.strictEqual(result.tileX, 739, 'London should be at tileX 739 at zoom 10');
            assert.strictEqual(result.tileY, 251, 'London should be at tileY 251 at zoom 10');
            assert.strictEqual(result.z, 10);
        });
        test('converts lat/lon to tile coordinates at zoom 8', async () => {
            const result = await latLonToTile(51.5074, -0.1276, 8);
            assert.strictEqual(result.tileX, 184, 'London should be at tileX 184 at zoom 8');
            assert.strictEqual(result.tileY, 62, 'London should be at tileY 62 at zoom 8');
            assert.strictEqual(result.z, 8);
        });
    });
    describe('latLonToPixelInTile', () => {
        test('converts lat/lon to pixel position at zoom 10', async () => {
            const result = await latLonToPixelInTile(51.5074, -0.1276, 10);
            assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE);
            assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE);
            assert.strictEqual(result.tileX, 739);
            assert.strictEqual(result.tileY, 251);
            assert.strictEqual(result.z, 10);
        });
        test('converts lat/lon to pixel position at zoom 8', async () => {
            const result = await latLonToPixelInTile(51.5074, -0.1276, 8);
            assert.ok(result.pixelX >= 0 && result.pixelX < TILE_SIZE);
            assert.ok(result.pixelY >= 0 && result.pixelY < TILE_SIZE);
            assert.strictEqual(result.tileX, 184);
            assert.strictEqual(result.tileY, 62);
            assert.strictEqual(result.z, 8);
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
        global.localStorage = {
            data: {},
            getItem(key) { return this.data[key] || null; },
            setItem(key, value) { this.data[key] = value; },
            removeItem(key) { delete this.data[key]; }
        };
        // Mock indexedDB
        global.indexedDB = null;
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
        });
    });
    describe('stats', () => {
        test('initializes with zeroed stats', () => {
            assert.strictEqual(adapter.stats.tilesFetched, 0);
            assert.strictEqual(adapter.stats.tilesFromCache, 0);
        });
    });
    describe('getTileUrl', () => {
        test('generates correct URL format with STANDARD_ZOOM', () => {
            // Test URL construction - coordinates are arbitrary for this test
            const testCases = [
                { mno: 'mno1', tileX: 100, tileY: 50 },
                { mno: 'mno2', tileX: 200, tileY: 100 },
                { mno: 'mno3', tileX: 150, tileY: 75 },
                { mno: 'mno4', tileX: 180, tileY: 60 },
            ];
            for (const tc of testCases) {
                const url = adapter.getTileUrl(tc.mno, tc.tileX, tc.tileY);
                const expected = `https://ofcom.europa.uk.com/tiles/gbof_${tc.mno}_raster_bng2/${STANDARD_ZOOM}/${tc.tileX}/${tc.tileY}.png?v=${TILE_VERSION}`;
                assert.strictEqual(url, expected);
            }
        });
        test('uses current STANDARD_ZOOM (8) in URLs', () => {
            assert.strictEqual(STANDARD_ZOOM, 8, 'STANDARD_ZOOM should be 8');
            const url = adapter.getTileUrl('mno1', 184, 62);
            assert.ok(url.includes('/8/'), 'URL should use zoom level 8');
        });
        test('handles all four MNO IDs', () => {
            const mnos = ['mno1', 'mno2', 'mno3', 'mno4'];
            for (const mno of mnos) {
                const url = adapter.getTileUrl(mno, 100, 100);
                assert.ok(url.includes(mno), `URL should contain ${mno}`);
                assert.ok(url.includes(`/${STANDARD_ZOOM}/100/100.png`), 'URL should contain tile coordinates');
            }
        });
    });
});
// Test tile URL construction
describe('Tile URL Construction', () => {
    const TILE_API_BASE = 'https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2';
    test('constructs correct tile URL format', () => {
        const mnoId = 'mno1';
        const tileX = 184;
        const tileY = 62;
        const url = `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`;
        assert.strictEqual(url, `https://ofcom.europa.uk.com/tiles/gbof_mno1_raster_bng2/${STANDARD_ZOOM}/184/62.png?v=${TILE_VERSION}`);
    });
    test('constructs URLs for all MNOs', () => {
        const mnoIds = ['mno1', 'mno2', 'mno3', 'mno4'];
        for (const mnoId of mnoIds) {
            const url = `${TILE_API_BASE.replace('{mno}', mnoId)}/${STANDARD_ZOOM}/0/0.png?v=${TILE_VERSION}`;
            assert.ok(url.includes(mnoId), `URL should include MNO ${mnoId}`);
            assert.ok(url.includes(`/${STANDARD_ZOOM}/`), 'URL should include zoom level');
        }
    });
    test('constructs URLs for zoom 10 tile coordinates (reference)', () => {
        // These tile coordinates were verified at zoom 10 (for documentation)
        // At zoom 8, different coordinates would be used
        const zoom10Mappings = [
            { location: 'AL5 3EH', mno: 'mno1', tileX: 713, tileY: 302 },
            { location: 'SW1A 1AA', mno: 'mno3', tileX: 738, tileY: 252 },
            { location: 'EH1 1YZ', mno: 'mno3', tileX: 454, tileY: 941 },
            { location: 'G2 1DY', mno: 'mno3', tileX: 361, tileY: 930 },
        ];
        for (const mapping of zoom10Mappings) {
            const url = `${TILE_API_BASE.replace('{mno}', mapping.mno)}/10/${mapping.tileX}/${mapping.tileY}.png?v=${TILE_VERSION}`;
            assert.ok(url.includes('/10/'), 'URL should use zoom 10 for these reference coordinates');
            assert.ok(url.includes(`/${mapping.tileX}/${mapping.tileY}.png`), `URL should include tile coordinates for ${mapping.location}`);
        }
    });
    test('constructs URLs for zoom 8 tile coordinates', () => {
        // At zoom 8, tiles are 4x larger than zoom 10
        // London: (739, 251) at zoom 10 → (184, 62) at zoom 8
        const zoom8Mappings = [
            { location: 'London', mno: 'mno1', tileX: 184, tileY: 62 },
            { location: 'Edinburgh', mno: 'mno3', tileX: 113, tileY: 234 },
        ];
        for (const mapping of zoom8Mappings) {
            const url = `${TILE_API_BASE.replace('{mno}', mapping.mno)}/8/${mapping.tileX}/${mapping.tileY}.png?v=${TILE_VERSION}`;
            assert.ok(url.includes('/8/'), 'URL should use zoom 8');
            assert.ok(url.includes(`/${mapping.tileX}/${mapping.tileY}.png`), `URL should include tile coordinates for ${mapping.location}`);
        }
    });
    test('handles large tile coordinates', () => {
        const url = `${TILE_API_BASE.replace('{mno}', 'mno1')}/${STANDARD_ZOOM}/999/999.png?v=${TILE_VERSION}`;
        assert.ok(url.includes('/999/999.png'), 'Should handle large tile coordinates');
    });
    test('URL format is consistent across all MNOs', () => {
        const mnoIds = ['mno1', 'mno2', 'mno3', 'mno4'];
        const tileX = 184;
        const tileY = 62;
        const urls = mnoIds.map(mno => `${TILE_API_BASE.replace('{mno}', mno)}/${STANDARD_ZOOM}/${tileX}/${tileY}.png?v=${TILE_VERSION}`);
        for (let i = 0; i < urls.length; i++) {
            assert.ok(urls[i].includes(`/${tileX}/${tileY}.png`), `URL ${i} should contain tile coordinates`);
            assert.ok(urls[i].includes(`v=${TILE_VERSION}`), `URL ${i} should contain version`);
            assert.ok(urls[i].includes(mnoIds[i]), `URL ${i} should contain MNO ID`);
        }
    });
});
// Test cache key construction
describe('Cache Key Construction', () => {
    test('creates unique cache keys', () => {
        const key1 = `mno1-${STANDARD_ZOOM}-184-62-v${TILE_VERSION}`;
        const key2 = `mno2-${STANDARD_ZOOM}-184-62-v${TILE_VERSION}`;
        const key3 = `mno1-${STANDARD_ZOOM}-185-62-v${TILE_VERSION}`;
        assert.notStrictEqual(key1, key2, 'Different MNOs should have different keys');
        assert.notStrictEqual(key1, key3, 'Different tiles should have different keys');
    });
    test('cache keys include all necessary components', () => {
        const testCases = [
            { mno: 'mno1', tileX: 184, tileY: 62 },
            { mno: 'mno2', tileX: 185, tileY: 62 },
            { mno: 'mno3', tileX: 113, tileY: 234 },
            { mno: 'mno4', tileX: 90, tileY: 231 },
        ];
        for (const tc of testCases) {
            const key = `${tc.mno}-${STANDARD_ZOOM}-${tc.tileX}-${tc.tileY}-v${TILE_VERSION}`;
            assert.ok(key.includes(tc.mno), 'Cache key should include MNO');
            assert.ok(key.includes(String(tc.tileX)), 'Cache key should include tileX');
            assert.ok(key.includes(String(tc.tileY)), 'Cache key should include tileY');
            assert.ok(key.includes(TILE_VERSION), 'Cache key should include version');
            assert.ok(key.includes(String(STANDARD_ZOOM)), 'Cache key should include zoom');
        }
    });
    test('cache keys are different for different locations', () => {
        const keys = [
            `mno1-${STANDARD_ZOOM}-184-62-v${TILE_VERSION}`, // London
            `mno3-${STANDARD_ZOOM}-185-62-v${TILE_VERSION}`, // East of London
            `mno3-${STANDARD_ZOOM}-113-234-v${TILE_VERSION}`, // Edinburgh
            `mno3-${STANDARD_ZOOM}-90-231-v${TILE_VERSION}`, // Glasgow
        ];
        const uniqueKeys = new Set(keys);
        assert.strictEqual(uniqueKeys.size, keys.length, 'All cache keys should be unique');
    });
    test('cache keys differ by zoom level', () => {
        const keyZ8 = `mno1-8-184-62-v${TILE_VERSION}`;
        const keyZ10 = `mno1-10-739-251-v${TILE_VERSION}`;
        assert.notStrictEqual(keyZ8, keyZ10, 'Cache keys at different zoom levels should differ');
        assert.ok(keyZ8.includes('-8-'), 'Zoom 8 key should include zoom level');
        assert.ok(keyZ10.includes('-10-'), 'Zoom 10 key should include zoom level');
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
//# sourceMappingURL=tile-api.test.js.map