import test from 'node:test';
import assert from 'node:assert';
import * as converter from './coordinate-converter.js';

test('Coordinate Converter - Reverse Conversion', async (t) => {
  await t.test('tileToBngBounds should return correct BNG bounds', () => {
    // Zoom 10, tile span = 1000
    // Tile (300, 400)
    // ORIGIN_X = -183000, ORIGIN_Y = -122000
    const bounds = converter.tileToBngBounds(300, 400, 10);
    assert.strictEqual(bounds.west, 300 * 1000 - 183000);
    assert.strictEqual(bounds.south, 400 * 1000 - 122000);
    assert.strictEqual(bounds.east, 301 * 1000 - 183000);
    assert.strictEqual(bounds.north, 401 * 1000 - 122000);
  });

  await t.test('latLonToTile should return correct indices for London', async () => {
    // London: 51.5074, -0.1278
    // Matches example in GEO.md: { x: 713, y: 302, z: 10 }
    const tile = await converter.latLonToTile(51.5074, -0.1278, 10);
    assert.strictEqual(tile.tileX, 713);
    assert.strictEqual(tile.tileY, 302);
  });

  await t.test('bngToLatLon and latLonToBng should be near-reciprocal', async () => {
    const lat = 51.5074;
    const lon = -0.1278; // London

    const { easting, northing } = await converter.latLonToBng(lat, lon);
    const back = await converter.bngToLatLon(easting, northing);

    assert.ok(Math.abs(back.lat - lat) < 0.0001);
    assert.ok(Math.abs(back.lon - lon) < 0.0001);
  });

  await t.test('tileToWgs84Bounds should return a bounding box', async () => {
    const bounds = await converter.tileToWgs84Bounds(350, 450, 10);
    assert.ok(bounds.north > bounds.south);
    assert.ok(bounds.east > bounds.west);
    assert.ok(bounds.south > 45); // Roughly UK latitudes
    assert.ok(bounds.north < 62);
  });
});
