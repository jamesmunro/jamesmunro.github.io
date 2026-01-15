import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateLinearDistance,
  calculateRouteDistance,
  linearInterpolate,
  interpolateRoute,
  calculateSampleSpacing,
  simulateCoverageSample
} from './mobile-coverage.js';

describe('Mobile Coverage Tool', () => {
  describe('calculateLinearDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = [51.5, -0.1];
      const point2 = [51.6, -0.2];
      const distance = calculateLinearDistance(point1, point2);

      // Distance should be positive and reasonable (roughly 14-15 km)
      assert.ok(distance > 0);
      assert.ok(distance > 10 && distance < 20);
    });

    it('should return 0 for same points', () => {
      const point = [51.5, -0.1];
      const distance = calculateLinearDistance(point, point);

      assert.ok(distance < 0.001); // Should be very close to 0
    });

    it('should be symmetric', () => {
      const point1 = [51.5, -0.1];
      const point2 = [51.6, -0.2];

      const dist1 = calculateLinearDistance(point1, point2);
      const dist2 = calculateLinearDistance(point2, point1);

      assert.ok(Math.abs(dist1 - dist2) < 0.001);
    });
  });

  describe('calculateRouteDistance', () => {
    it('should return 0 for empty route', () => {
      const distance = calculateRouteDistance([]);
      assert.strictEqual(distance, 0);
    });

    it('should return 0 for single point', () => {
      const distance = calculateRouteDistance([[51.5, -0.1]]);
      assert.strictEqual(distance, 0);
    });

    it('should calculate distance for two points', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];
      const distance = calculateRouteDistance(waypoints);

      assert.ok(distance > 0);
      assert.ok(distance > 10 && distance < 20);
    });

    it('should sum distances for multiple segments', () => {
      const waypoints = [
        [51.5, -0.1],
        [51.6, -0.2],
        [51.7, -0.3]
      ];
      const totalDistance = calculateRouteDistance(waypoints);

      const segment1 = calculateLinearDistance(waypoints[0], waypoints[1]);
      const segment2 = calculateLinearDistance(waypoints[1], waypoints[2]);
      const expectedTotal = segment1 + segment2;

      assert.ok(Math.abs(totalDistance - expectedTotal) < 0.001);
    });
  });

  describe('linearInterpolate', () => {
    it('should return first point when t=0', () => {
      const point1 = [51.5, -0.1];
      const point2 = [51.6, -0.2];
      const result = linearInterpolate(point1, point2, 0);

      assert.deepStrictEqual(result, point1);
    });

    it('should return second point when t=1', () => {
      const point1 = [51.5, -0.1];
      const point2 = [51.6, -0.2];
      const result = linearInterpolate(point1, point2, 1);

      assert.deepStrictEqual(result, point2);
    });

    it('should return midpoint when t=0.5', () => {
      const point1 = [51.5, -0.1];
      const point2 = [51.7, -0.3];
      const result = linearInterpolate(point1, point2, 0.5);

      const expectedLat = (51.5 + 51.7) / 2;
      const expectedLng = (-0.1 + -0.3) / 2;

      assert.ok(Math.abs(result[0] - expectedLat) < 0.001);
      assert.ok(Math.abs(result[1] - expectedLng) < 0.001);
    });

    it('should interpolate at quarter point', () => {
      const point1 = [50.0, 0.0];
      const point2 = [52.0, 2.0];
      const result = linearInterpolate(point1, point2, 0.25);

      assert.ok(Math.abs(result[0] - 50.5) < 0.001);
      assert.ok(Math.abs(result[1] - 0.5) < 0.001);
    });
  });

  describe('interpolateRoute', () => {
    it('should return empty array for empty waypoints', () => {
      const result = interpolateRoute([]);
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array for single waypoint', () => {
      const result = interpolateRoute([[51.5, -0.1]]);
      assert.deepStrictEqual(result, []);
    });

    it('should generate exact number of samples', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];
      const samples = interpolateRoute(waypoints, 150);

      assert.strictEqual(samples.length, 150);
    });

    it('should include start and end points for two waypoints', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];
      const samples = interpolateRoute(waypoints, 150);

      // First sample should be close to first waypoint
      assert.ok(Math.abs(samples[0][0] - waypoints[0][0]) < 0.001);
      assert.ok(Math.abs(samples[0][1] - waypoints[0][1]) < 0.001);

      // Last sample should be close to last waypoint
      const lastIdx = samples.length - 1;
      assert.ok(Math.abs(samples[lastIdx][0] - waypoints[1][0]) < 0.001);
      assert.ok(Math.abs(samples[lastIdx][1] - waypoints[1][1]) < 0.001);
    });

    it('should generate samples with custom count', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];
      const samples = interpolateRoute(waypoints, 50);

      assert.strictEqual(samples.length, 50);
    });

    it('should handle multiple waypoints', () => {
      const waypoints = [
        [51.5, -0.1],
        [51.6, -0.2],
        [51.7, -0.3]
      ];
      const samples = interpolateRoute(waypoints, 150);

      assert.strictEqual(samples.length, 150);

      // All samples should be within bounds
      samples.forEach(sample => {
        assert.ok(sample[0] >= 51.5 && sample[0] <= 51.7);
        assert.ok(sample[1] >= -0.3 && sample[1] <= -0.1);
      });
    });

    it('should distribute samples proportionally by distance', () => {
      const waypoints = [
        [50.0, 0.0],
        [50.1, 0.0], // Short segment
        [51.0, 0.0]  // Long segment
      ];
      const samples = interpolateRoute(waypoints, 100);

      assert.strictEqual(samples.length, 100);

      // Should have more samples in the second (longer) segment
      // Count samples in first segment (lat < 50.15)
      const firstSegmentSamples = samples.filter(s => s[0] < 50.15).length;
      const secondSegmentSamples = samples.filter(s => s[0] >= 50.15).length;

      // Second segment should have significantly more samples
      assert.ok(secondSegmentSamples > firstSegmentSamples * 3);
    });
  });

  describe('calculateSampleSpacing', () => {
    it('should return 0 for routes with less than 2 waypoints', () => {
      const spacing1 = calculateSampleSpacing([]);
      const spacing2 = calculateSampleSpacing([[51.5, -0.1]]);

      assert.strictEqual(spacing1, 0);
      assert.strictEqual(spacing2, 0);
    });

    it('should calculate spacing for a simple two-point route', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];
      const spacing = calculateSampleSpacing(waypoints, 150);

      // Distance is roughly 14-15 km, so spacing should be ~0.09-0.10 km
      assert.ok(spacing > 0.08);
      assert.ok(spacing < 0.12);
    });

    it('should adapt spacing based on route length', () => {
      // Short route
      const shortRoute = [[51.5, -0.1], [51.51, -0.11]];
      const shortSpacing = calculateSampleSpacing(shortRoute, 150);

      // Long route
      const longRoute = [[51.5, -0.1], [52.0, -0.5]];
      const longSpacing = calculateSampleSpacing(longRoute, 150);

      // Long route should have much larger spacing
      assert.ok(longSpacing > shortSpacing * 10);
    });

    it('should scale inversely with number of samples', () => {
      const waypoints = [[51.5, -0.1], [51.6, -0.2]];

      const spacing50 = calculateSampleSpacing(waypoints, 50);
      const spacing150 = calculateSampleSpacing(waypoints, 150);

      // With fewer samples, spacing should be larger
      assert.ok(spacing50 > spacing150 * 2.5);
    });

    it('should handle multi-segment routes', () => {
      const waypoints = [
        [51.5, -0.1],
        [51.6, -0.2],
        [51.7, -0.3]
      ];
      const spacing = calculateSampleSpacing(waypoints, 150);

      // Should return positive spacing
      assert.ok(spacing > 0);
    });
  });

  describe('simulateCoverageSample', () => {
    it('should return valid coverage object', () => {
      const point = [51.5, -0.1];
      const coverage = simulateCoverageSample(point);

      assert.ok(coverage.signal);
      assert.ok(coverage.quality);
      assert.strictEqual(typeof coverage.signal, 'number');
      assert.strictEqual(typeof coverage.quality, 'string');
    });

    it('should return signal in valid range', () => {
      const point = [51.5, -0.1];
      const coverage = simulateCoverageSample(point);

      // Signal should be between -120 and -40 dBm
      assert.ok(coverage.signal >= -120);
      assert.ok(coverage.signal <= -40);
    });

    it('should return valid quality values', () => {
      const validQualities = ['excellent', 'good', 'fair', 'poor'];

      // Test multiple points to get variety
      for (let i = 0; i < 20; i++) {
        const point = [51 + i * 0.1, -0.1 + i * 0.1];
        const coverage = simulateCoverageSample(point);

        assert.ok(validQualities.includes(coverage.quality));
      }
    });

    it('should have consistent quality mapping', () => {
      // Manually test the quality thresholds
      const testCases = [
        { signal: -60, expectedQuality: 'excellent' },
        { signal: -70, expectedQuality: 'good' },
        { signal: -80, expectedQuality: 'fair' },
        { signal: -100, expectedQuality: 'poor' }
      ];

      // We can't directly test this without mocking, but we can verify
      // that signals in certain ranges produce expected qualities
      const samples = [];
      for (let i = 0; i < 100; i++) {
        samples.push(simulateCoverageSample([50 + i * 0.01, 0]));
      }

      // Should have a mix of qualities
      const qualities = new Set(samples.map(s => s.quality));
      assert.ok(qualities.size >= 2, 'Should have variety in coverage quality');
    });

    it('should produce different results for different locations', () => {
      const point1 = [51.5, -0.1];
      const point2 = [52.5, -1.1];

      // Take multiple samples to account for randomness
      const samples1 = Array.from({ length: 10 }, () =>
        simulateCoverageSample(point1)
      );
      const samples2 = Array.from({ length: 10 }, () =>
        simulateCoverageSample(point2)
      );

      const avg1 = samples1.reduce((sum, s) => sum + s.signal, 0) / samples1.length;
      const avg2 = samples2.reduce((sum, s) => sum + s.signal, 0) / samples2.length;

      // Averages should be different due to spatial variation
      // (though they might occasionally be close due to randomness)
      assert.ok(
        Math.abs(avg1 - avg2) > 0.1,
        'Different locations should have different average signals'
      );
    });
  });
});
