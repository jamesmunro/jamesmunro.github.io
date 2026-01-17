import { test, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { CoverageAnalyzer } from './coverage-analyzer.mjs';
import { LeafletMap } from './leaflet-map.mjs';

// Setup minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="map-container"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.L = {
  map: () => ({
    setView: () => {},
    fitBounds: () => {},
  }),
  tileLayer: () => ({
    addTo: () => {},
  }),
  polyline: () => ({
    addTo: () => {},
    getBounds: () => {},
  }),
  marker: () => ({
    addTo: () => ({
      bindPopup: () => ({
        openPopup: () => {},
      }),
    }),
  }),
};

test('previewRoute successfully fetches and draws a route', async () => {
  const getRouteMock = mock.method(CoverageAnalyzer.prototype, 'getRoute');
  const drawRouteMock = mock.method(LeafletMap.prototype, 'drawRoute');
  const routeData = { coordinates: [[-0.1, 51.5], [-0.2, 51.6]] };
  getRouteMock.mock.mockImplementation(async () => routeData);

  const { previewRoute } = await import('./route-visualizer.mjs');
  await previewRoute('SW1A 1AA', 'EC2N 2DB', 'API_KEY');

  assert.strictEqual(getRouteMock.mock.calls.length, 1);
  assert.deepStrictEqual(getRouteMock.mock.calls[0].arguments, ['SW1A 1AA', 'EC2N 2DB', 'API_KEY', 'driving-car']);

  assert.strictEqual(drawRouteMock.mock.calls.length, 1);
  assert.deepStrictEqual(drawRouteMock.mock.calls[0].arguments, [routeData.coordinates]);
  
  getRouteMock.mock.restore();
  drawRouteMock.mock.restore();
});

test('previewRoute handles errors from getRoute', async () => {
  const getRouteMock = mock.method(CoverageAnalyzer.prototype, 'getRoute');
  const drawRouteMock = mock.method(LeafletMap.prototype, 'drawRoute');
  const testError = new Error('Failed to fetch');
  getRouteMock.mock.mockImplementation(async () => {
    throw testError;
  });

  const { previewRoute } = await import('./route-visualizer.mjs');
  await assert.rejects(
    () => previewRoute('SW1A 1AA', 'EC2N 2DB', 'API_KEY'),
    testError
  );

  assert.strictEqual(drawRouteMock.mock.calls.length, 0);
  
  getRouteMock.mock.restore();
  drawRouteMock.mock.restore();
});
