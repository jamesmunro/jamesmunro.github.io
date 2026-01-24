/**
 * Unit tests for ChartRenderer
 * Tests pure functions without DOM dependencies
 */

import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import type { Chart as ChartJS } from 'chart.js';
import type { CoverageResult, NetworkCoverageResult } from '../../types/coverage.js';

// Setup minimal DOM environment for ChartRenderer
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as unknown as { window: typeof dom.window }).window = dom.window;
(global as unknown as { document: typeof dom.window.document }).document = dom.window.document;

// Mock Chart.js (not testing chart rendering itself)
class MockChart {
  constructor() {}
  destroy() {}
  static getChart(): ChartJS | null { return null; }
}
(global as unknown as { Chart: typeof MockChart }).Chart = MockChart;

const { ChartRenderer } = await import('./chart-renderer.js');

describe('ChartRenderer', () => {
  let renderer: InstanceType<typeof ChartRenderer>;

  before(() => {
    renderer = new ChartRenderer('test-canvas');
  });

  describe('getSignalLevel', () => {
    test('returns 0 for null/undefined network data', () => {
      assert.strictEqual(renderer.getSignalLevel(null as unknown as NetworkCoverageResult), 0);
      assert.strictEqual(renderer.getSignalLevel(undefined), 0);
    });

    test('returns 0 for network data with error', () => {
      const networkData: NetworkCoverageResult = { error: 'Some error', level: null };
      assert.strictEqual(renderer.getSignalLevel(networkData), 0);
    });

    test('returns the level when valid', () => {
      assert.strictEqual(renderer.getSignalLevel({ level: 0 }), 0);
      assert.strictEqual(renderer.getSignalLevel({ level: 1 }), 1);
      assert.strictEqual(renderer.getSignalLevel({ level: 2 }), 2);
      assert.strictEqual(renderer.getSignalLevel({ level: 3 }), 3);
      assert.strictEqual(renderer.getSignalLevel({ level: 4 }), 4);
    });

    test('clamps level to 0-4 range', () => {
      assert.strictEqual(renderer.getSignalLevel({ level: -1 as unknown as 0 }), 0, 'Should clamp negative to 0');
      assert.strictEqual(renderer.getSignalLevel({ level: 5 as unknown as 4 }), 4, 'Should clamp >4 to 4');
      assert.strictEqual(renderer.getSignalLevel({ level: 100 as unknown as 4 }), 4, 'Should clamp large values to 4');
    });

    test('returns 0 for non-numeric level', () => {
      assert.strictEqual(renderer.getSignalLevel({ level: 'good' as unknown as null }), 0);
      assert.strictEqual(renderer.getSignalLevel({ level: null }), 0);
      assert.strictEqual(renderer.getSignalLevel({} as NetworkCoverageResult), 0);
    });
  });

  describe('calculateSummary', () => {
    test('calculates correct cumulative percentages for uniform coverage', () => {
      // All points have level 4 for all networks
      const coverageResults: CoverageResult[] = Array(10).fill(null).map(() => ({
        point: { distance: 0, lat: 0, lng: 0 },
        coverage: {
          latitude: 0,
          longitude: 0,
          networks: {
            EE: { level: 4 },
            Vodafone: { level: 4 },
            O2: { level: 4 },
            Three: { level: 4 }
          }
        }
      }));

      const summary = renderer.calculateSummary(coverageResults);

      // All cumulative columns should be 100% since all points are level 4
      assert.strictEqual(summary.EE['Indoor+'], 100, 'Level ≥4');
      assert.strictEqual(summary.EE['Indoor'], 100, 'Level ≥3');
      assert.strictEqual(summary.EE['Outdoor'], 100, 'Level ≥2');
      assert.strictEqual(summary.EE['Variable'], 100, 'Level ≥1');
      assert.strictEqual(summary.EE['Poor/None'], 0, 'Level =0');
      assert.strictEqual(summary.EE.avgLevel, 4);
    });

    test('calculates correct cumulative percentages for mixed coverage', () => {
      // 5 points with level 4, 5 points with level 0
      const coverageResults: CoverageResult[] = [
        ...Array(5).fill(null).map(() => ({
          point: { distance: 0, lat: 0, lng: 0 },
          coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 as const }, Vodafone: { level: 4 as const }, O2: { level: 4 as const }, Three: { level: 4 as const } } }
        })),
        ...Array(5).fill(null).map(() => ({
          point: { distance: 0, lat: 0, lng: 0 },
          coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 as const }, Vodafone: { level: 0 as const }, O2: { level: 0 as const }, Three: { level: 0 as const } } }
        }))
      ];

      const summary = renderer.calculateSummary(coverageResults);

      // 5 of 10 points are level 4, so cumulative percentages reflect this
      assert.strictEqual(summary.EE['Indoor+'], 50, '5/10 points are ≥4');
      assert.strictEqual(summary.EE['Indoor'], 50, '5/10 points are ≥3');
      assert.strictEqual(summary.EE['Outdoor'], 50, '5/10 points are ≥2');
      assert.strictEqual(summary.EE['Variable'], 50, '5/10 points are ≥1');
      assert.strictEqual(summary.EE['Poor/None'], 50, '5/10 points are =0');
      assert.strictEqual(summary.EE.avgLevel, 2);
    });

    test('handles missing network data gracefully', () => {
      const coverageResults: CoverageResult[] = [
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: {} } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: null as unknown as CoverageResult['coverage'] },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } }
      ];

      const summary = renderer.calculateSummary(coverageResults);

      // Should not throw and should calculate based on available data
      assert.ok(summary.EE, 'Should have EE summary');
      assert.ok(typeof summary.EE.avgLevel === 'number', 'avgLevel should be a number');
    });

    test('handles empty results', () => {
      const summary = renderer.calculateSummary([]);

      assert.strictEqual(summary.EE['Indoor+'], 0);
      assert.strictEqual(summary.EE['Outdoor'], 0);
      assert.strictEqual(summary.EE.avgLevel, 0);
    });

    test('correctly calculates cumulative "or better" percentages', () => {
      // Each level appears once: 4, 3, 2, 1, 0
      const coverageResults: CoverageResult[] = [
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 1 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } },
      ];

      const summary = renderer.calculateSummary(coverageResults);

      // Cumulative "or better" percentages:
      assert.strictEqual(summary.EE['Indoor+'], 20, '1/5 points are ≥4 (level 4)');
      assert.strictEqual(summary.EE['Indoor'], 40, '2/5 points are ≥3 (levels 4,3)');
      assert.strictEqual(summary.EE['Outdoor'], 60, '3/5 points are ≥2 (levels 4,3,2)');
      assert.strictEqual(summary.EE['Variable'], 80, '4/5 points are ≥1 (levels 4,3,2,1)');
      assert.strictEqual(summary.EE['Poor/None'], 20, '1/5 points are =0');
    });

    test('calculates average level correctly', () => {
      const coverageResults: CoverageResult[] = [
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 0 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 1 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 2 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 3 } } } },
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: { EE: { level: 4 } } } },
      ];

      const summary = renderer.calculateSummary(coverageResults);

      assert.strictEqual(summary.EE.avgLevel, 2, 'Average of 0,1,2,3,4 should be 2');
    });
  });

  describe('prepareChartData', () => {
    test('converts distances to kilometers', () => {
      const coverageResults: CoverageResult[] = [
        {
          point: { distance: 1000, lat: 51.5, lng: -0.1 },
          coverage: { latitude: 51.5, longitude: -0.1, networks: { EE: { level: 4 } } }
        },
        {
          point: { distance: 5000, lat: 51.6, lng: -0.2 },
          coverage: { latitude: 51.6, longitude: -0.2, networks: { EE: { level: 3 } } }
        }
      ];

      const datasets = renderer.prepareChartData(coverageResults);
      const eeDataset = datasets.find(d => d.label === 'EE');

      assert.strictEqual(eeDataset!.data[0].x, 1, 'First point should be 1km');
      assert.strictEqual(eeDataset!.data[1].x, 5, 'Second point should be 5km');
    });

    test('creates datasets for all four networks', () => {
      const coverageResults: CoverageResult[] = [
        {
          point: { distance: 0, lat: 51.5, lng: -0.1 },
          coverage: { latitude: 51.5, longitude: -0.1, networks: { EE: { level: 4 }, Vodafone: { level: 3 }, O2: { level: 2 }, Three: { level: 1 } } }
        }
      ];

      const datasets = renderer.prepareChartData(coverageResults);

      assert.strictEqual(datasets.length, 4, 'Should have 4 datasets');
      assert.ok(datasets.find(d => d.label === 'EE'), 'Should have EE dataset');
      assert.ok(datasets.find(d => d.label === 'Vodafone'), 'Should have Vodafone dataset');
      assert.ok(datasets.find(d => d.label === 'O2'), 'Should have O2 dataset');
      assert.ok(datasets.find(d => d.label === 'Three'), 'Should have Three dataset');
    });

    test('includes lat/lng in data points', () => {
      const coverageResults: CoverageResult[] = [
        {
          point: { distance: 0, lat: 51.5074, lng: -0.1276 },
          coverage: { latitude: 51.5074, longitude: -0.1276, networks: { EE: { level: 4 } } }
        }
      ];

      const datasets = renderer.prepareChartData(coverageResults);
      const eeDataset = datasets.find(d => d.label === 'EE');

      assert.strictEqual(eeDataset!.data[0].lat, 51.5074);
      assert.strictEqual(eeDataset!.data[0].lng, -0.1276);
    });

    test('uses correct brand colors', () => {
      const coverageResults: CoverageResult[] = [
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { latitude: 0, longitude: 0, networks: {} } }
      ];

      const datasets = renderer.prepareChartData(coverageResults);

      const eeDataset = datasets.find(d => d.label === 'EE');
      const vodafoneDataset = datasets.find(d => d.label === 'Vodafone');
      const o2Dataset = datasets.find(d => d.label === 'O2');
      const threeDataset = datasets.find(d => d.label === 'Three');

      assert.strictEqual(eeDataset!.borderColor, '#009a9a');
      assert.strictEqual(vodafoneDataset!.borderColor, '#e60000');
      assert.strictEqual(o2Dataset!.borderColor, '#0019a5');
      assert.strictEqual(threeDataset!.borderColor, '#333333');
    });
  });
});
