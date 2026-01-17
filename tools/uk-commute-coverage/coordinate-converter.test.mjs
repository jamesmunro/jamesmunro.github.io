import test from 'node:test';
import assert from 'node:assert';
import * as converter from './coordinate-converter.mjs';

test('Coordinate Converter - Reverse Conversion', async (t) => {
  await t.test('tileToBngBounds should return correct BNG bounds', () => {
    // Zoom 10, resolution 5.6, tile size 256 -> tile span = 1433.6
    // Tile (300, 400)
    const bounds = converter.tileToBngBounds(300, 400, 10);
    assert.strictEqual(bounds.west, 300 * 1433.6);
    assert.strictEqual(bounds.south, 400 * 1433.6);
    assert.strictEqual(bounds.east, 301 * 1433.6);
    assert.strictEqual(bounds.north, 401 * 1433.6);
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
