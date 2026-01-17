import { test, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// Setup minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map-container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.google = {
  maps: {
    Map: class {
      constructor() {}
      setCenter() {}
      setZoom() {}
    },
    DirectionsRenderer: class {
      constructor() {}
      setMap() {}
      setDirections() {}
    },
    LatLngBounds: class {
      constructor() {}
      extend() {}
    },
    Polyline: class {
      constructor() {}
      setMap() {}
    },
    Marker: class {
      constructor() {}
    },
    Geocoder: class {
      geocode({ address }, callback) {
        callback([{ geometry: { location: { lat: () => 51.501, lng: () => -0.1418 } } }], 'OK');
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
    TravelMode: { DRIVING: 'DRIVING' }
  }
};

// Now dynamic import after mocks
const { CoverageAnalyzer } = await import('./coverage-analyzer.mjs');
const { GoogleMap } = await import('./google-map.mjs');
const { previewRoute } = await import('./route-visualizer.mjs');

test('previewRoute successfully fetches and draws a route', async () => {
  const getRouteMock = mock.method(CoverageAnalyzer.prototype, 'getRoute');
  const initMapMock = mock.method(GoogleMap.prototype, 'initMap');
  const setDirectionsMock = mock.method(GoogleMap.prototype, 'setDirections');
  const clearDirectionsMock = mock.method(GoogleMap.prototype, 'clearDirections');
  
  const routeData = { 
    coordinates: [[-0.1, 51.5], [-0.2, 51.6]],
    fullResult: { routes: [] }
  };
  getRouteMock.mock.mockImplementation(async () => routeData);
  
  // Update initMapMock to set directionsRenderer so setDirections doesn't fail
  initMapMock.mock.mockImplementation(async function() {
    this.directionsRenderer = new google.maps.DirectionsRenderer();
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
