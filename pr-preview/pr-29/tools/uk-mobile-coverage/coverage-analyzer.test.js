/**
 * Unit tests for coverage analyzer modules
 * Run with: npm test
 */

const { describe, test } = require('node:test');
const assert = require('node:assert');
const { haversineDistance, sampleRoute, getTotalDistance } = require('./route-sampler.js');

describe('Route Sampler', () => {
  describe('haversineDistance', () => {
    test('calculates distance between London and Manchester correctly', () => {
      // London: -0.1276, 51.5074
      // Manchester: -2.2426, 53.4808
      const london = [-0.1276, 51.5074];
      const manchester = [-2.2426, 53.4808];

      const distance = haversineDistance(london, manchester);

      // Expected distance is approximately 262 km (262000 meters)
      assert.ok(distance > 260000, 'Distance should be greater than 260km');
      assert.ok(distance < 265000, 'Distance should be less than 265km');
    });

    test('returns 0 for same point', () => {
      const point = [-0.1276, 51.5074];
      const distance = haversineDistance(point, point);
      assert.strictEqual(distance, 0);
    });

    test('returns same distance regardless of direction', () => {
      const point1 = [-0.1276, 51.5074];
      const point2 = [-2.2426, 53.4808];

      const dist1 = haversineDistance(point1, point2);
      const dist2 = haversineDistance(point2, point1);

      assert.ok(Math.abs(dist1 - dist2) < 0.01, 'Distances should be equal in both directions');
    });
  });

  describe('sampleRoute', () => {
    test('samples a straight route at 500m intervals', () => {
      // Create a simple route (approx 3km)
      const route = [
        [-0.1276, 51.5074],  // London
        [-0.0876, 51.5074]   // ~3km east
      ];

      const sampled = sampleRoute(route, 500);

      // Should have roughly 5-8 points (3000m / 500m = 6)
      assert.ok(sampled.length > 4, 'Should have more than 4 points');
      assert.ok(sampled.length < 10, 'Should have fewer than 10 points');

      // First point should match start
      assert.ok(Math.abs(sampled[0].lng - route[0][0]) < 0.0001, 'First point longitude should match');
      assert.ok(Math.abs(sampled[0].lat - route[0][1]) < 0.0001, 'First point latitude should match');
      assert.strictEqual(sampled[0].distance, 0, 'First point distance should be 0');
    });

    test('handles multi-segment routes', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.1176, 51.5074],
        [-0.1076, 51.5074]
      ];

      const sampled = sampleRoute(route, 100);

      assert.ok(sampled.length > 10, 'Should have more than 10 points');

      // Distances should be monotonically increasing
      for (let i = 1; i < sampled.length; i++) {
        assert.ok(sampled[i].distance >= sampled[i-1].distance,
          `Distance at index ${i} should be >= previous`);
      }
    });

    test('throws error for invalid input', () => {
      assert.throws(() => sampleRoute([], 500), /at least 2 points/);
      assert.throws(() => sampleRoute([[-0.1276, 51.5074]], 500), /at least 2 points/);
      assert.throws(() => sampleRoute(null, 500), /at least 2 points/);
    });

    test('skips zero-length segments', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.1276, 51.5074],  // Duplicate point
        [-0.1176, 51.5074]
      ];

      const sampled = sampleRoute(route, 100);

      // Should not crash and should produce valid output
      assert.ok(sampled.length > 0, 'Should produce at least one point');
    });

    test('distance property increases correctly', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.0876, 51.5074]
      ];

      const sampled = sampleRoute(route, 1000);

      // Each point should have increasing distance
      for (let i = 1; i < sampled.length; i++) {
        assert.ok(sampled[i].distance > sampled[i-1].distance,
          'Each point should have greater distance than previous');
      }

      // Last point distance should be close to total route distance
      const totalDist = getTotalDistance(route);
      const lastDist = sampled[sampled.length - 1].distance;
      assert.ok(Math.abs(lastDist - totalDist) < 100,
        'Last point distance should be close to total distance');
    });
  });

  describe('getTotalDistance', () => {
    test('calculates total distance for multi-segment route', () => {
      const route = [
        [-0.1276, 51.5074],  // London
        [-0.0876, 51.5074],  // ~3km east
        [-0.0876, 51.5474]   // ~4.5km north
      ];

      const total = getTotalDistance(route);

      // Should be approximately 7.5km (7500m)
      assert.ok(total > 7000, 'Total distance should be > 7000m');
      assert.ok(total < 8000, 'Total distance should be < 8000m');
    });

    test('returns 0 for single point', () => {
      const route = [[-0.1276, 51.5074]];
      const total = getTotalDistance(route);
      assert.strictEqual(total, 0);
    });
  });
});
