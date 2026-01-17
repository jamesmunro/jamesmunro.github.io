/**
 * Unit tests for CoverageAnalyzer
 * Tests the pure functions and geocoding/directions mocks
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock the browser environment and Google Maps API BEFORE importing CoverageAnalyzer
const googleMock = {
  maps: {
    Geocoder: class {
      geocode({ address }, callback) {
        if (address.includes('SW1A 1AA')) {
          callback([{ geometry: { location: { lat: () => 51.501, lng: () => -0.1418 } } }], 'OK');
        } else {
          callback(null, 'ZERO_RESULTS');
        }
      }
    },
    DirectionsService: class {
      route({ origin, destination }, callback) {
        callback({
          routes: [{
            overview_path: [
              { lat: () => 51.501, lng: () => -0.1418 },
              { lat: () => 51.502, lng: () => -0.1420 }
            ],
            legs: [{ distance: { value: 200 } }]
          }]
        }, 'OK');
      }
    },
    TravelMode: { 
      DRIVING: 'DRIVING',
      TRANSIT: 'TRANSIT',
      BICYCLING: 'BICYCLING',
      WALKING: 'WALKING'
    }
  }
};

global.google = googleMock;
globalThis.google = googleMock;

global.window = {
  location: { pathname: 'uk-commute-coverage' },
  google: googleMock
};
global.document = {
  createElement: () => ({}),
  head: { appendChild: () => {} },
  getElementById: (id) => {
    const base = {
      addEventListener: () => {},
      appendChild: () => {},
      style: {},
      value: '',
      innerHTML: ''
    };
    if (id === 'route-form') {
      return { 
        ...base,
        querySelector: () => ({ disabled: false })
      };
    }
    return base;
  },
  addEventListener: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Now import after mocks are set
const { CoverageAnalyzer } = await import('./coverage-analyzer.mjs');

describe('CoverageAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CoverageAnalyzer();
  });

  describe('validatePostcode', () => {
    test('accepts valid postcodes with space', () => {
      assert.doesNotThrow(() => analyzer.validatePostcode('SW1A 1AA'));
    });

    test('rejects invalid postcodes', () => {
      assert.throws(() => analyzer.validatePostcode('INVALID'), /Invalid postcode format/);
    });
  });

  describe('postcodeToCoordinates', () => {
    test('converts valid postcode to coordinates', async () => {
      const coords = await analyzer.postcodeToCoordinates('SW1A 1AA');
      assert.strictEqual(coords.lat(), 51.501);
      assert.strictEqual(coords.lng(), -0.1418);
    });

    test('throws error for invalid postcode geocoding', async () => {
      await assert.rejects(
        () => analyzer.postcodeToCoordinates('INVALID'),
        /Geocoding failed/
      );
    });
  });

  describe('fetchRoute', () => {
    test('fetches route between coordinates', async () => {
      const start = { lat: () => 51.501, lng: () => -0.1418 };
      const end = { lat: () => 51.502, lng: () => -0.1420 };
      const route = await analyzer.fetchRoute(start, end);
      
      assert.ok(Array.isArray(route.coordinates));
      assert.strictEqual(route.coordinates.length, 2);
      assert.strictEqual(route.distance, 200);
    });

    test('fetches transit route', async () => {
      const start = { lat: () => 51.501, lng: () => -0.1418 };
      const end = { lat: () => 51.502, lng: () => -0.1420 };
      const route = await analyzer.fetchRoute(start, end, 'transit');
      
      assert.ok(Array.isArray(route.coordinates));
      assert.strictEqual(route.coordinates.length, 2);
    });
  });
});
