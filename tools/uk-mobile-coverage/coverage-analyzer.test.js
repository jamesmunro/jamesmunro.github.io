/**
 * Unit tests for coverage analyzer modules
 * Run with: npm test
 */

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
      expect(distance).toBeGreaterThan(260000);
      expect(distance).toBeLessThan(265000);
    });

    test('returns 0 for same point', () => {
      const point = [-0.1276, 51.5074];
      const distance = haversineDistance(point, point);
      expect(distance).toBe(0);
    });

    test('returns same distance regardless of direction', () => {
      const point1 = [-0.1276, 51.5074];
      const point2 = [-2.2426, 53.4808];

      const dist1 = haversineDistance(point1, point2);
      const dist2 = haversineDistance(point2, point1);

      expect(dist1).toBeCloseTo(dist2, 0);
    });
  });

  describe('sampleRoute', () => {
    test('samples a straight route at 500m intervals', () => {
      // Create a simple route (approx 5km)
      const route = [
        [-0.1276, 51.5074],  // London
        [-0.0876, 51.5074]   // ~4km east
      ];

      const sampled = sampleRoute(route, 500);

      // Should have roughly 8-10 points (5000m / 500m = 10)
      expect(sampled.length).toBeGreaterThan(7);
      expect(sampled.length).toBeLessThan(12);

      // First point should match start
      expect(sampled[0].lng).toBeCloseTo(route[0][0], 4);
      expect(sampled[0].lat).toBeCloseTo(route[0][1], 4);
      expect(sampled[0].distance).toBe(0);
    });

    test('handles multi-segment routes', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.1176, 51.5074],
        [-0.1076, 51.5074]
      ];

      const sampled = sampleRoute(route, 100);

      expect(sampled.length).toBeGreaterThan(10);

      // Distances should be monotonically increasing
      for (let i = 1; i < sampled.length; i++) {
        expect(sampled[i].distance).toBeGreaterThanOrEqual(sampled[i-1].distance);
      }
    });

    test('throws error for invalid input', () => {
      expect(() => sampleRoute([], 500)).toThrow('at least 2 points');
      expect(() => sampleRoute([[-0.1276, 51.5074]], 500)).toThrow('at least 2 points');
      expect(() => sampleRoute(null, 500)).toThrow('at least 2 points');
    });

    test('skips zero-length segments', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.1276, 51.5074],  // Duplicate point
        [-0.1176, 51.5074]
      ];

      const sampled = sampleRoute(route, 100);

      // Should not crash and should produce valid output
      expect(sampled.length).toBeGreaterThan(0);
    });

    test('distance property increases correctly', () => {
      const route = [
        [-0.1276, 51.5074],
        [-0.0876, 51.5074]
      ];

      const sampled = sampleRoute(route, 1000);

      // Each point should have increasing distance
      for (let i = 1; i < sampled.length; i++) {
        expect(sampled[i].distance).toBeGreaterThan(sampled[i-1].distance);
      }

      // Last point distance should be close to total route distance
      const totalDist = getTotalDistance(route);
      expect(sampled[sampled.length - 1].distance).toBeCloseTo(totalDist, -2);
    });
  });

  describe('getTotalDistance', () => {
    test('calculates total distance for multi-segment route', () => {
      const route = [
        [-0.1276, 51.5074],  // London
        [-0.0876, 51.5074],  // ~4km east
        [-0.0876, 51.5474]   // ~4.5km north
      ];

      const total = getTotalDistance(route);

      // Should be approximately 8.5km (8500m)
      expect(total).toBeGreaterThan(8000);
      expect(total).toBeLessThan(9000);
    });

    test('returns 0 for single point', () => {
      const route = [[-0.1276, 51.5074]];
      const total = getTotalDistance(route);
      expect(total).toBe(0);
    });
  });
});

describe('Coverage Adapter', () => {
  // Note: Coverage adapter tests would require mocking fetch
  // Skipping for now as this is basic unit testing

  test.skip('generates consistent mock data for same postcode', () => {
    // This would test the generateMockCoverage function
  });
});

describe('Chart Renderer', () => {
  // Note: Chart renderer tests would require DOM mocking
  // Skipping for now as this is basic unit testing

  test.skip('correctly determines signal level', () => {
    // This would test the getSignalLevel function
  });
});
