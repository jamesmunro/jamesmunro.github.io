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

  await t.test('adjacent tiles have continuous boundaries', () => {
    // Test horizontal adjacency
    const tile1 = converter.tileToBngBounds(713, 302, 10);
    const tile2 = converter.tileToBngBounds(714, 302, 10);
    assert.strictEqual(tile1.east, tile2.west, 'Horizontally adjacent tiles should share east/west boundary');

    // Test vertical adjacency
    const tile3 = converter.tileToBngBounds(713, 302, 10);
    const tile4 = converter.tileToBngBounds(713, 303, 10);
    assert.strictEqual(tile3.north, tile4.south, 'Vertically adjacent tiles should share north/south boundary');
  });

  await t.test('tile grid has no gaps or overlaps', () => {
    // Sample various tile positions and verify grid consistency
    for (let tx = 300; tx < 305; tx++) {
      for (let ty = 300; ty < 305; ty++) {
        const current = converter.tileToBngBounds(tx, ty, 10);

        // Verify tile dimensions are consistent
        const width = current.east - current.west;
        const height = current.north - current.south;
        assert.strictEqual(width, 1000, `Tile ${tx},${ty} should be 1000m wide at zoom 10`);
        assert.strictEqual(height, 1000, `Tile ${tx},${ty} should be 1000m tall at zoom 10`);

        // Verify right neighbor aligns
        const right = converter.tileToBngBounds(tx + 1, ty, 10);
        assert.strictEqual(current.east, right.west, `Gap/overlap between tiles ${tx},${ty} and ${tx+1},${ty}`);

        // Verify top neighbor aligns
        const top = converter.tileToBngBounds(tx, ty + 1, 10);
        assert.strictEqual(current.north, top.south, `Gap/overlap between tiles ${tx},${ty} and ${tx},${ty+1}`);
      }
    }
  });

  await t.test('coordinates on tile boundaries are handled consistently', async () => {
    // Get a tile boundary
    const bounds = converter.tileToBngBounds(713, 302, 10);

    // Test point exactly on western boundary
    const westTile = converter.bngToTile(bounds.west, bounds.south + 500, 10);
    assert.strictEqual(westTile.tileX, 713, 'Point on west boundary should belong to this tile');

    // Test point exactly on eastern boundary (should be in next tile)
    const eastTile = converter.bngToTile(bounds.east, bounds.south + 500, 10);
    assert.strictEqual(eastTile.tileX, 714, 'Point on east boundary should belong to next tile');

    // Test point exactly on southern boundary
    const southTile = converter.bngToTile(bounds.west + 500, bounds.south, 10);
    assert.strictEqual(southTile.tileY, 302, 'Point on south boundary should belong to this tile');

    // Test point exactly on northern boundary (should be in next tile)
    const northTile = converter.bngToTile(bounds.west + 500, bounds.north, 10);
    assert.strictEqual(northTile.tileY, 303, 'Point on north boundary should belong to next tile');
  });

  await t.test('pixel coordinates are within valid bounds', async () => {
    // Test various UK locations
    const locations = [
      { lat: 51.5014, lon: -0.1419 },  // London
      { lat: 55.9533, lon: -3.1883 },  // Edinburgh
      { lat: 55.8642, lon: -4.2518 },  // Glasgow
      { lat: 50.3755, lon: -4.1427 },  // Plymouth (SW)
      { lat: 57.1497, lon: -2.0943 },  // Aberdeen (NE)
    ];

    for (const loc of locations) {
      const pixel = await converter.latLonToPixelInTile(loc.lat, loc.lon, 10);
      assert.ok(pixel.pixelX >= 0 && pixel.pixelX < 256,
        `Pixel X ${pixel.pixelX} out of bounds for ${loc.lat},${loc.lon}`);
      assert.ok(pixel.pixelY >= 0 && pixel.pixelY < 256,
        `Pixel Y ${pixel.pixelY} out of bounds for ${loc.lat},${loc.lon}`);
    }
  });

  await t.test('round-trip tile conversion preserves tile coordinates', async () => {
    // Verified tile coordinates from Ofcom service
    const testTiles = [
      { tileX: 713, tileY: 302 },  // AL5 3EH
      { tileX: 738, tileY: 252 },  // SW1A 1AA
      { tileX: 454, tileY: 941 },  // EH1 1YZ
      { tileX: 361, tileY: 930 },  // G2 1DY
    ];

    for (const original of testTiles) {
      // Get bounds of tile
      const bounds = converter.tileToBngBounds(original.tileX, original.tileY, 10);

      // Pick center point of tile
      const centerEasting = (bounds.west + bounds.east) / 2;
      const centerNorthing = (bounds.south + bounds.north) / 2;

      // Convert back to tile
      const recovered = converter.bngToTile(centerEasting, centerNorthing, 10);

      assert.strictEqual(recovered.tileX, original.tileX,
        `Round-trip failed for tileX ${original.tileX}`);
      assert.strictEqual(recovered.tileY, original.tileY,
        `Round-trip failed for tileY ${original.tileY}`);
    }
  });
});
