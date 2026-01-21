/**
 * Unit tests for ChartRenderer
 * Tests pure functions without DOM dependencies
 */

import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Setup minimal DOM environment for ChartRenderer
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

// Mock Chart.js (not testing chart rendering itself)
global.Chart = class MockChart {
  constructor() {}
  destroy() {}
  static getChart() { return null; }
};

import { ChartRenderer } from './chart-renderer.mjs';

describe('ChartRenderer', () => {
  let renderer;

  before(() => {
    renderer = new ChartRenderer('test-canvas');
  });

  describe('getSignalLevel', () => {
    test('returns 0 for null/undefined network data', () => {
      assert.strictEqual(renderer.getSignalLevel(null), 0);
      assert.strictEqual(renderer.getSignalLevel(undefined), 0);
    });

    test('returns 0 for network data with error', () => {
      const networkData = { error: 'Some error' };
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
      assert.strictEqual(renderer.getSignalLevel({ level: -1 }), 0, 'Should clamp negative to 0');
      assert.strictEqual(renderer.getSignalLevel({ level: 5 }), 4, 'Should clamp >4 to 4');
      assert.strictEqual(renderer.getSignalLevel({ level: 100 }), 4, 'Should clamp large values to 4');
    });

    test('returns 0 for non-numeric level', () => {
      assert.strictEqual(renderer.getSignalLevel({ level: 'good' }), 0);
      assert.strictEqual(renderer.getSignalLevel({ level: null }), 0);
      assert.strictEqual(renderer.getSignalLevel({}), 0);
    });
  });

  describe('calculateSummary', () => {
    test('calculates correct percentages for uniform coverage', () => {
      // All points have level 4 for all networks
      const coverageResults = Array(10).fill(null).map(() => ({
        point: { distance: 0 },
        coverage: {
          networks: {
            EE: { level: 4 },
            Vodafone: { level: 4 },
            O2: { level: 4 },
            Three: { level: 4 }
          }
        }
      }));

      const summary = renderer.calculateSummary(coverageResults);

      assert.strictEqual(summary.EE['Excellent'], 100);
      assert.strictEqual(summary.EE['Good'], 100);
      assert.strictEqual(summary.EE['Adequate'], 100);
      assert.strictEqual(summary.EE['Poor/None'], 0);
      assert.strictEqual(summary.EE.avgLevel, 4);
    });

    test('calculates correct percentages for mixed coverage', () => {
      // 5 points with level 4, 5 points with level 0
      const coverageResults = [
        ...Array(5).fill(null).map(() => ({
          point: { distance: 0 },
          coverage: { networks: { EE: { level: 4 }, Vodafone: { level: 4 }, O2: { level: 4 }, Three: { level: 4 } } }
        })),
        ...Array(5).fill(null).map(() => ({
          point: { distance: 0 },
          coverage: { networks: { EE: { level: 0 }, Vodafone: { level: 0 }, O2: { level: 0 }, Three: { level: 0 } } }
        }))
      ];

      const summary = renderer.calculateSummary(coverageResults);

      assert.strictEqual(summary.EE['Excellent'], 50);
      assert.strictEqual(summary.EE['Poor/None'], 50);
      assert.strictEqual(summary.EE.avgLevel, 2);
    });

    test('handles missing network data gracefully', () => {
      const coverageResults = [
        { point: { distance: 0 }, coverage: { networks: {} } },
        { point: { distance: 0 }, coverage: null },
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 4 } } } }
      ];

      const summary = renderer.calculateSummary(coverageResults);

      // Should not throw and should calculate based on available data
      assert.ok(summary.EE, 'Should have EE summary');
      assert.ok(typeof summary.EE.avgLevel === 'number', 'avgLevel should be a number');
    });

    test('handles empty results', () => {
      const summary = renderer.calculateSummary([]);

      assert.strictEqual(summary.EE['Excellent'], 0);
      assert.strictEqual(summary.EE['Good'], 0);
      assert.strictEqual(summary.EE.avgLevel, 0);
    });

    test('correctly categorizes coverage levels', () => {
      // Level 3+ = Excellent, Level 2+ = Good, Level 1+ = Adequate, Level 0 = Poor/None
      const coverageResults = [
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 4 } } } }, // Excellent
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 3 } } } }, // Excellent
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 2 } } } }, // Good (not excellent)
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 1 } } } }, // Adequate (not good)
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 0 } } } }, // Poor/None
      ];

      const summary = renderer.calculateSummary(coverageResults);

      assert.strictEqual(summary.EE['Excellent'], 40, '2 of 5 points are level 3+');
      assert.strictEqual(summary.EE['Good'], 60, '3 of 5 points are level 2+');
      assert.strictEqual(summary.EE['Adequate'], 80, '4 of 5 points are level 1+');
      assert.strictEqual(summary.EE['Poor/None'], 20, '1 of 5 points is level 0');
    });

    test('calculates average level correctly', () => {
      const coverageResults = [
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 0 } } } },
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 1 } } } },
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 2 } } } },
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 3 } } } },
        { point: { distance: 0 }, coverage: { networks: { EE: { level: 4 } } } },
      ];

      const summary = renderer.calculateSummary(coverageResults);

      assert.strictEqual(summary.EE.avgLevel, 2, 'Average of 0,1,2,3,4 should be 2');
    });
  });

  describe('prepareChartData', () => {
    test('converts distances to kilometers', () => {
      const coverageResults = [
        {
          point: { distance: 1000, lat: 51.5, lng: -0.1 },
          coverage: { networks: { EE: { level: 4 } } }
        },
        {
          point: { distance: 5000, lat: 51.6, lng: -0.2 },
          coverage: { networks: { EE: { level: 3 } } }
        }
      ];

      const datasets = renderer.prepareChartData(coverageResults);
      const eeDataset = datasets.find(d => d.label === 'EE');

      assert.strictEqual(eeDataset.data[0].x, 1, 'First point should be 1km');
      assert.strictEqual(eeDataset.data[1].x, 5, 'Second point should be 5km');
    });

    test('creates datasets for all four networks', () => {
      const coverageResults = [
        {
          point: { distance: 0, lat: 51.5, lng: -0.1 },
          coverage: { networks: { EE: { level: 4 }, Vodafone: { level: 3 }, O2: { level: 2 }, Three: { level: 1 } } }
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
      const coverageResults = [
        {
          point: { distance: 0, lat: 51.5074, lng: -0.1276 },
          coverage: { networks: { EE: { level: 4 } } }
        }
      ];

      const datasets = renderer.prepareChartData(coverageResults);
      const eeDataset = datasets.find(d => d.label === 'EE');

      assert.strictEqual(eeDataset.data[0].lat, 51.5074);
      assert.strictEqual(eeDataset.data[0].lng, -0.1276);
    });

    test('uses correct brand colors', () => {
      const coverageResults = [
        { point: { distance: 0, lat: 0, lng: 0 }, coverage: { networks: {} } }
      ];

      const datasets = renderer.prepareChartData(coverageResults);

      const eeDataset = datasets.find(d => d.label === 'EE');
      const vodafoneDataset = datasets.find(d => d.label === 'Vodafone');
      const o2Dataset = datasets.find(d => d.label === 'O2');
      const threeDataset = datasets.find(d => d.label === 'Three');

      assert.strictEqual(eeDataset.borderColor, '#009a9a');
      assert.strictEqual(vodafoneDataset.borderColor, '#e60000');
      assert.strictEqual(o2Dataset.borderColor, '#0019a5');
      assert.strictEqual(threeDataset.borderColor, '#333333');
    });
  });
});
