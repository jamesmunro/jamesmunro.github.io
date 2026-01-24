import test from 'node:test';
import assert from 'node:assert';
import * as converter from './coordinate-converter.js';
import { STANDARD_ZOOM } from './constants.js';
// Known locations with BNG coordinates for testing
const KNOWN_LOCATIONS = {
    london: { lat: 51.5074, lon: -0.1278, bngE: 530034, bngN: 179949 },
    edinburgh: { lat: 55.9533, lon: -3.1883, bngE: 325713, bngN: 673224 },
    glasgow: { lat: 55.8642, lon: -4.2518, bngE: 259053, bngN: 665470 },
};
// Tile coordinates verified against Ofcom service at ZOOM 10
const VERIFIED_TILES_Z10 = [
    { location: 'AL5 3EH', tileX: 713, tileY: 302 },
    { location: 'SW1A 1AA (Westminster)', tileX: 738, tileY: 252 },
    { location: 'EH1 1YZ (Edinburgh)', tileX: 454, tileY: 941 },
    { location: 'G2 1DY (Glasgow)', tileX: 361, tileY: 930 },
];
// Helper to calculate expected tile at any zoom from BNG
function calculateExpectedTile(easting, northing, zoom) {
    const RESOLUTIONS = [2867.2, 1433.6, 716.8, 358.4, 179.2, 89.6, 44.8, 22.4, 11.2, 5.6, 2.8, 1.4];
    const TILE_SIZE = 256;
    const ORIGIN_X = 0;
    const ORIGIN_Y = 0;
    const resolution = RESOLUTIONS[zoom];
    const tileSpan = resolution * TILE_SIZE;
    return {
        tileX: Math.floor((easting - ORIGIN_X) / tileSpan),
        tileY: Math.floor((northing - ORIGIN_Y) / tileSpan),
    };
}
test('Coordinate Converter - Multi-Zoom Support', async (t) => {
    await t.test('STANDARD_ZOOM constant is correctly configured', () => {
        assert.strictEqual(STANDARD_ZOOM, 8, 'STANDARD_ZOOM should be 8');
        assert.ok(STANDARD_ZOOM >= 0 && STANDARD_ZOOM <= 11, 'STANDARD_ZOOM must be valid zoom level');
    });
    await t.test('tile coordinates scale correctly between zoom 8 and zoom 10', async () => {
        // At zoom 8, tiles are 4x larger than at zoom 10
        // So tile indices should be roughly 1/4 of zoom 10 values
        const { lat, lon } = KNOWN_LOCATIONS.london;
        const tileZ10 = await converter.latLonToTile(lat, lon, 10);
        const tileZ8 = await converter.latLonToTile(lat, lon, 8);
        // The ratio should be approximately 4:1 (with some variation due to grid alignment)
        const ratioX = tileZ10.tileX / tileZ8.tileX;
        const ratioY = tileZ10.tileY / tileZ8.tileY;
        assert.ok(ratioX > 3.5 && ratioX < 4.5, `X ratio ${ratioX} should be ~4 (z10: ${tileZ10.tileX}, z8: ${tileZ8.tileX})`);
        assert.ok(ratioY > 3.5 && ratioY < 4.5, `Y ratio ${ratioY} should be ~4 (z10: ${tileZ10.tileY}, z8: ${tileZ8.tileY})`);
    });
    await t.test('latLonToTile returns correct indices for London at zoom 10', async () => {
        const tile = await converter.latLonToTile(51.5074, -0.1278, 10);
        assert.strictEqual(tile.tileX, 739);
        assert.strictEqual(tile.tileY, 251);
        assert.strictEqual(tile.z, 10);
    });
    await t.test('latLonToTile returns correct indices for London at zoom 8', async () => {
        const tile = await converter.latLonToTile(51.5074, -0.1278, 8);
        // At zoom 8, tiles are 4x larger, so coordinates are ~1/4
        assert.strictEqual(tile.tileX, 184);
        assert.strictEqual(tile.tileY, 62);
        assert.strictEqual(tile.z, 8);
    });
    await t.test('bngToTile produces consistent results at both zoom levels', () => {
        // Test with London BNG coordinates
        const easting = 530000;
        const northing = 180000;
        const tileZ10 = converter.bngToTile(easting, northing, 10);
        const tileZ8 = converter.bngToTile(easting, northing, 8);
        // Verify zoom levels are stored
        assert.strictEqual(tileZ10.z, 10);
        assert.strictEqual(tileZ8.z, 8);
        // Calculate expected values manually
        const expectedZ10 = calculateExpectedTile(easting, northing, 10);
        const expectedZ8 = calculateExpectedTile(easting, northing, 8);
        assert.strictEqual(tileZ10.tileX, expectedZ10.tileX);
        assert.strictEqual(tileZ10.tileY, expectedZ10.tileY);
        assert.strictEqual(tileZ8.tileX, expectedZ8.tileX);
        assert.strictEqual(tileZ8.tileY, expectedZ8.tileY);
    });
    await t.test('tile spans are correct for zoom 8 and zoom 10', () => {
        // Zoom 10: 2.8 m/px * 256 = 716.8m per tile
        const boundsZ10_1 = converter.tileToBngBounds(0, 0, 10);
        const boundsZ10_2 = converter.tileToBngBounds(1, 0, 10);
        const spanZ10 = boundsZ10_2.west - boundsZ10_1.west;
        assert.ok(Math.abs(spanZ10 - 716.8) < 0.01, `Zoom 10 tile span should be 716.8m, got ${spanZ10}`);
        // Zoom 8: 11.2 m/px * 256 = 2867.2m per tile
        const boundsZ8_1 = converter.tileToBngBounds(0, 0, 8);
        const boundsZ8_2 = converter.tileToBngBounds(1, 0, 8);
        const spanZ8 = boundsZ8_2.west - boundsZ8_1.west;
        assert.ok(Math.abs(spanZ8 - 2867.2) < 0.01, `Zoom 8 tile span should be 2867.2m, got ${spanZ8}`);
        // Zoom 8 span should be 4x zoom 10 span
        assert.ok(Math.abs(spanZ8 / spanZ10 - 4) < 0.001, 'Zoom 8 tiles should be 4x larger than zoom 10');
    });
});
test('Coordinate Converter - Zoom 10 Reference Tests', async (t) => {
    await t.test('tileToBngBounds returns correct bounds at zoom 10', () => {
        const tileSpan = 2.8 * 256; // 716.8
        const ORIGIN_X = 0;
        const ORIGIN_Y = 0;
        const bounds = converter.tileToBngBounds(300, 400, 10);
        assert.strictEqual(bounds.west, 300 * tileSpan + ORIGIN_X);
        assert.strictEqual(bounds.south, 400 * tileSpan + ORIGIN_Y);
        assert.strictEqual(bounds.east, 301 * tileSpan + ORIGIN_X);
        assert.strictEqual(bounds.north, 401 * tileSpan + ORIGIN_Y);
    });
    await t.test('verified tile coordinates are correct at zoom 10', async () => {
        // These tiles were verified against the Ofcom service at zoom 10
        for (const verified of VERIFIED_TILES_Z10) {
            const bounds = converter.tileToBngBounds(verified.tileX, verified.tileY, 10);
            const centerEasting = (bounds.west + bounds.east) / 2;
            const centerNorthing = (bounds.south + bounds.north) / 2;
            const recovered = converter.bngToTile(centerEasting, centerNorthing, 10);
            assert.strictEqual(recovered.tileX, verified.tileX, `Round-trip failed for ${verified.location} tileX`);
            assert.strictEqual(recovered.tileY, verified.tileY, `Round-trip failed for ${verified.location} tileY`);
        }
    });
    await t.test('adjacent tiles have continuous boundaries at zoom 10', () => {
        const tile1 = converter.tileToBngBounds(713, 302, 10);
        const tile2 = converter.tileToBngBounds(714, 302, 10);
        assert.strictEqual(tile1.east, tile2.west, 'Horizontally adjacent tiles should share boundary');
        const tile3 = converter.tileToBngBounds(713, 302, 10);
        const tile4 = converter.tileToBngBounds(713, 303, 10);
        assert.strictEqual(tile3.north, tile4.south, 'Vertically adjacent tiles should share boundary');
    });
});
test('Coordinate Converter - Zoom 8 Reference Tests', async (t) => {
    await t.test('tileToBngBounds returns correct bounds at zoom 8', () => {
        const tileSpan = 11.2 * 256; // 2867.2
        const ORIGIN_X = 0;
        const ORIGIN_Y = 0;
        const bounds = converter.tileToBngBounds(100, 50, 8);
        assert.strictEqual(bounds.west, 100 * tileSpan + ORIGIN_X);
        assert.strictEqual(bounds.south, 50 * tileSpan + ORIGIN_Y);
        assert.strictEqual(bounds.east, 101 * tileSpan + ORIGIN_X);
        assert.strictEqual(bounds.north, 51 * tileSpan + ORIGIN_Y);
    });
    await t.test('zoom 8 tile contains corresponding zoom 10 tiles', () => {
        // A zoom 8 tile should contain exactly 16 zoom 10 tiles (4x4)
        const z8Tile = { x: 184, y: 62 }; // London at zoom 8
        const z8Bounds = converter.tileToBngBounds(z8Tile.x, z8Tile.y, 8);
        // Check corners at zoom 10
        const swZ10 = converter.bngToTile(z8Bounds.west + 1, z8Bounds.south + 1, 10);
        const neZ10 = converter.bngToTile(z8Bounds.east - 1, z8Bounds.north - 1, 10);
        // The zoom 10 tiles should span 4 tiles in each direction within the zoom 8 tile
        const xSpan = neZ10.tileX - swZ10.tileX + 1;
        const ySpan = neZ10.tileY - swZ10.tileY + 1;
        assert.strictEqual(xSpan, 4, `Z10 tiles should span 4 in X (got ${xSpan})`);
        assert.strictEqual(ySpan, 4, `Z10 tiles should span 4 in Y (got ${ySpan})`);
    });
    await t.test('adjacent tiles have continuous boundaries at zoom 8', () => {
        const tile1 = converter.tileToBngBounds(184, 62, 8);
        const tile2 = converter.tileToBngBounds(185, 62, 8);
        assert.strictEqual(tile1.east, tile2.west, 'Horizontally adjacent tiles should share boundary');
        const tile3 = converter.tileToBngBounds(184, 62, 8);
        const tile4 = converter.tileToBngBounds(184, 63, 8);
        assert.strictEqual(tile3.north, tile4.south, 'Vertically adjacent tiles should share boundary');
    });
    await t.test('pixel coordinates are within bounds at zoom 8', async () => {
        const locations = [
            KNOWN_LOCATIONS.london,
            KNOWN_LOCATIONS.edinburgh,
            KNOWN_LOCATIONS.glasgow,
        ];
        for (const loc of locations) {
            const pixel = await converter.latLonToPixelInTile(loc.lat, loc.lon, 8);
            assert.ok(pixel.pixelX >= 0 && pixel.pixelX < 256, `Pixel X ${pixel.pixelX} out of bounds at zoom 8`);
            assert.ok(pixel.pixelY >= 0 && pixel.pixelY < 256, `Pixel Y ${pixel.pixelY} out of bounds at zoom 8`);
            assert.strictEqual(pixel.z, 8);
        }
    });
});
test('Coordinate Converter - BNG Conversions', async (t) => {
    await t.test('bngToLatLon and latLonToBng are near-reciprocal', async () => {
        const { lat, lon } = KNOWN_LOCATIONS.london;
        const { easting, northing } = await converter.latLonToBng(lat, lon);
        const back = await converter.bngToLatLon(easting, northing);
        assert.ok(Math.abs(back.lat - lat) < 0.0001);
        assert.ok(Math.abs(back.lon - lon) < 0.0001);
    });
    await t.test('converts London coordinates to BNG correctly', async () => {
        const result = await converter.latLonToBng(51.5074, -0.1276);
        // London should be around E 530000, N 180000
        assert.ok(result.easting > 520000 && result.easting < 540000, `Easting ${result.easting} should be around 530000`);
        assert.ok(result.northing > 170000 && result.northing < 190000, `Northing ${result.northing} should be around 180000`);
    });
    await t.test('converts Edinburgh coordinates to BNG correctly', async () => {
        const result = await converter.latLonToBng(55.9533, -3.1883);
        // Edinburgh should be around E 325000, N 673000
        assert.ok(result.easting > 315000 && result.easting < 335000, `Easting ${result.easting} should be around 325000`);
        assert.ok(result.northing > 663000 && result.northing < 683000, `Northing ${result.northing} should be around 673000`);
    });
});
test('Coordinate Converter - Edge Cases', async (t) => {
    await t.test('throws error for invalid zoom level', () => {
        assert.throws(() => converter.bngToTile(530000, 180000, -1), /Zoom level must be between/);
        assert.throws(() => converter.bngToTile(530000, 180000, 12), /Zoom level must be between/);
        assert.throws(() => converter.bngToPixelInTile(530000, 180000, -1), /Zoom level must be between/);
        assert.throws(() => converter.bngToPixelInTile(530000, 180000, 12), /Zoom level must be between/);
    });
    await t.test('tileToWgs84Bounds returns valid bounding box', async () => {
        // Test at both zoom levels
        for (const zoom of [8, 10]) {
            const bounds = await converter.tileToWgs84Bounds(350, 450, zoom);
            assert.ok(bounds.north > bounds.south, `North should be greater than south at zoom ${zoom}`);
            assert.ok(bounds.east > bounds.west, `East should be greater than west at zoom ${zoom}`);
            assert.ok(bounds.south > 45, `Should be in UK latitudes at zoom ${zoom}`);
            assert.ok(bounds.north < 62, `Should be in UK latitudes at zoom ${zoom}`);
        }
    });
    await t.test('handles boundary coordinates consistently', () => {
        const bounds = converter.tileToBngBounds(184, 62, 8);
        // Point on western boundary belongs to this tile
        const westTile = converter.bngToTile(bounds.west, bounds.south + 500, 8);
        assert.strictEqual(westTile.tileX, 184, 'Point on west boundary should belong to this tile');
        // Point on eastern boundary belongs to next tile
        const eastTile = converter.bngToTile(bounds.east, bounds.south + 500, 8);
        assert.strictEqual(eastTile.tileX, 185, 'Point on east boundary should belong to next tile');
    });
});
test('Coordinate Converter - DEFAULT_ZOOM uses STANDARD_ZOOM', async (t) => {
    await t.test('DEFAULT_ZOOM equals STANDARD_ZOOM', () => {
        assert.strictEqual(converter.DEFAULT_ZOOM, STANDARD_ZOOM, 'DEFAULT_ZOOM should match STANDARD_ZOOM from constants');
    });
    await t.test('functions use correct default zoom', async () => {
        const { lat, lon } = KNOWN_LOCATIONS.london;
        // Call without explicit zoom - should use STANDARD_ZOOM (8)
        const tileDefault = await converter.latLonToTile(lat, lon);
        const tileExplicit = await converter.latLonToTile(lat, lon, STANDARD_ZOOM);
        assert.strictEqual(tileDefault.tileX, tileExplicit.tileX);
        assert.strictEqual(tileDefault.tileY, tileExplicit.tileY);
        assert.strictEqual(tileDefault.z, STANDARD_ZOOM);
    });
});
//# sourceMappingURL=coordinate-converter.test.js.map