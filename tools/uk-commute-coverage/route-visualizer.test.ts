import { test, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Setup minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map-container"></div></body></html>');
(global as unknown as { window: typeof dom.window }).window = dom.window;
(global as unknown as { document: typeof dom.window.document }).document = dom.window.document;

interface MockGoogleMaps {
  Map: new () => { setCenter: () => void; setZoom: () => void };
  DirectionsRenderer: new () => { setMap: () => void; setDirections: () => void };
  LatLngBounds: new () => { extend: () => void; isEmpty: () => boolean };
  Polyline: new () => { setMap: () => void };
  Marker: new () => void;
  Geocoder: new () => { geocode: (req: { address: string }, cb: (results: unknown[], status: string) => void) => void };
  DirectionsService: new () => { route: (req: { origin: unknown; destination: unknown }, cb: (result: unknown, status: string) => void) => void };
  TravelMode: { DRIVING: string };
  GroundOverlay: new () => { setMap: () => void };
}

const googleMock = {
  maps: {
    Map: class {
      constructor() {}
      setCenter(): void {}
      setZoom(): void {}
    },
    DirectionsRenderer: class {
      constructor() {}
      setMap(): void {}
      setDirections(): void {}
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
    Geocoder: class {
      geocode({ address }: { address: string }, callback: (results: unknown[], status: string) => void): void {
        callback([{ geometry: { location: { lat: () => 51.501, lng: () => -0.1418 } } }], 'OK');
      }
    },
    DirectionsService: class {
      route({ origin, destination }: { origin: unknown; destination: unknown }, callback: (result: unknown, status: string) => void): void {
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
    TravelMode: { DRIVING: 'DRIVING' },
    GroundOverlay: class {
      constructor() {}
      setMap(): void {}
    }
  } as MockGoogleMaps
};

(global as unknown as { google: typeof googleMock }).google = googleMock;

// Now dynamic import after mocks
const { CoverageAnalyzer } = await import('./coverage-analyzer.js');
const { GoogleMap } = await import('./google-map.js');
const { previewRoute } = await import('./route-visualizer.js');

test('previewRoute successfully fetches and draws a route', async () => {
  const getRouteMock = mock.method(CoverageAnalyzer.prototype, 'getRoute');
  const initMapMock = mock.method(GoogleMap.prototype, 'initMap');
  const setDirectionsMock = mock.method(GoogleMap.prototype, 'setDirections');
  const clearDirectionsMock = mock.method(GoogleMap.prototype, 'clearDirections');

  const routeData = {
    coordinates: [[-0.1, 51.5], [-0.2, 51.6]] as Array<[number, number]>,
    fullResult: { routes: [] } as unknown as google.maps.DirectionsResult,
    distance: 200
  };
  getRouteMock.mock.mockImplementation(async () => routeData);

  // Update initMapMock to set directionsRenderer so setDirections doesn't fail
  initMapMock.mock.mockImplementation(async function(this: InstanceType<typeof GoogleMap>) {
    (this as unknown as { directionsRenderer: unknown }).directionsRenderer = new (googleMock.maps.DirectionsRenderer as new () => unknown)();
  });

  await previewRoute('SW1A 1AA', 'EC2N 2DB', 'API_KEY');

  assert.strictEqual(getRouteMock.mock.calls.length, 1);
  assert.strictEqual(initMapMock.mock.calls.length, 1);
  assert.strictEqual(setDirectionsMock.mock.calls.length, 1);

  getRouteMock.mock.restore();
  initMapMock.mock.restore();
  setDirectionsMock.mock.restore();
  clearDirectionsMock.mock.restore();
});

test('previewRoute handles errors from getRoute', async () => {
  const getRouteMock = mock.method(CoverageAnalyzer.prototype, 'getRoute');
  const initMapMock = mock.method(GoogleMap.prototype, 'initMap');

  const testError = new Error('Failed to fetch');
  getRouteMock.mock.mockImplementation(async () => {
    throw testError;
  });

  await assert.rejects(
    () => previewRoute('SW1A 1AA', 'EC2N 2DB', 'API_KEY'),
    testError
  );

  assert.strictEqual(initMapMock.mock.calls.length, 0);

  getRouteMock.mock.restore();
  initMapMock.mock.restore();
});
