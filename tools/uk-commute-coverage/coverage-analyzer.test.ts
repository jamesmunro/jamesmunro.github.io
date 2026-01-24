/**
 * Unit tests for CoverageAnalyzer
 * Tests the pure functions and geocoding/directions mocks
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock the browser environment and Google Maps API BEFORE importing CoverageAnalyzer
interface MockGeocoderResult {
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

type GeocoderCallback = (results: MockGeocoderResult[] | null, status: string) => void;

interface MockDirectionsResult {
  routes: Array<{
    overview_path: Array<{
      lat: () => number;
      lng: () => number;
    }>;
    legs: Array<{
      distance: { value: number };
    }>;
  }>;
}

type DirectionsCallback = (result: MockDirectionsResult, status: string) => void;

const googleMock = {
  maps: {
    Geocoder: class {
      geocode({ address }: { address: string }, callback: GeocoderCallback): void {
        if (address.includes('SW1A 1AA')) {
          callback([{ geometry: { location: { lat: () => 51.501, lng: () => -0.1418 } } }], 'OK');
        } else {
          callback(null, 'ZERO_RESULTS');
        }
      }
    },
    DirectionsService: class {
      route(_request: unknown, callback: DirectionsCallback): void {
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
    DirectionsRenderer: class {
      constructor() {}
      setMap(): void {}
      setDirections(): void {}
      setOptions(): void {}
    },
    LatLngBounds: class {
      constructor() {}
      extend(): void {}
      isEmpty(): boolean { return false; }
    },
    Polyline: class {
      constructor() {}
      setMap(): void {}
    },
    Marker: class {
      constructor() {}
    },
    Map: class {
      constructor() {}
      fitBounds(): void {}
    },
    GroundOverlay: class {
      constructor() {}
      setMap(): void {}
    },
    TravelMode: {
      DRIVING: 'DRIVING',
      TRANSIT: 'TRANSIT',
      BICYCLING: 'BICYCLING',
      WALKING: 'WALKING'
    }
  }
};

(global as unknown as { google: typeof googleMock }).google = googleMock;
(globalThis as unknown as { google: typeof googleMock }).google = googleMock;

interface MockWindow {
  location: { pathname: string };
  google: typeof googleMock;
}

interface MockDocument {
  createElement: () => Record<string, unknown>;
  head: { appendChild: () => void };
  getElementById: (id: string) => Record<string, unknown> | null;
  addEventListener: () => void;
  readyState: string;
}

(global as unknown as { window: MockWindow }).window = {
  location: { pathname: 'uk-commute-coverage' },
  google: googleMock
};

(global as unknown as { document: MockDocument }).document = {
  createElement: () => ({}),
  head: { appendChild: () => {} },
  getElementById: (id: string) => {
    const base = {
      addEventListener: () => {},
      appendChild: () => {},
      style: {} as Record<string, string>,
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
  addEventListener: () => {},
  readyState: 'complete'
};

// Mock indexedDB as null (tests run in Node without IndexedDB)
(global as unknown as { indexedDB: null }).indexedDB = null;

// Now import after mocks are set
const { CoverageAnalyzer } = await import('./coverage-analyzer.js');

describe('CoverageAnalyzer', () => {
  let analyzer: InstanceType<typeof CoverageAnalyzer>;

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
      const start = { lat: () => 51.501, lng: () => -0.1418 } as google.maps.LatLng;
      const end = { lat: () => 51.502, lng: () => -0.1420 } as google.maps.LatLng;
      const route = await analyzer.fetchRoute(start, end);

      assert.ok(Array.isArray(route.coordinates));
      assert.strictEqual(route.coordinates.length, 2);
      assert.strictEqual(route.distance, 200);
    });

    test('fetches transit route', async () => {
      const start = { lat: () => 51.501, lng: () => -0.1418 } as google.maps.LatLng;
      const end = { lat: () => 51.502, lng: () => -0.1420 } as google.maps.LatLng;
      const route = await analyzer.fetchRoute(start, end, 'transit');

      assert.ok(Array.isArray(route.coordinates));
      assert.strictEqual(route.coordinates.length, 2);
    });
  });
});
