
import { CoverageAnalyzer } from './coverage-analyzer.mjs';
import { LeafletMap } from './leaflet-map.mjs';

// Main application setup
if (window.location.pathname.includes('uk-commute-coverage')) {
  const analyzer = new CoverageAnalyzer();
  analyzer.init();
}

// New route preview functionality
const previewBtn = document.getElementById('preview-btn');
previewBtn.addEventListener('click', async () => {
  const startPostcode = document.getElementById('start').value.trim().toUpperCase();
  const endPostcode = document.getElementById('end').value.trim().toUpperCase();
  const apiKey = document.getElementById('ors-api-key').value.trim();
  const profile = document.getElementById('route-profile').value;
  const previewContainer = document.getElementById('preview-container');
  const mapContainer = document.getElementById('map-container');
  const errorEl = document.getElementById('error');

  // Basic input check
  if (!startPostcode || !endPostcode || !apiKey) {
    errorEl.textContent = 'Please fill in start postcode, end postcode, and API key.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  previewContainer.style.display = 'block';
  mapContainer.style.display = 'block';

  const leafletMap = new LeafletMap('map-container');
  const analyzer = new CoverageAnalyzer();

  previewBtn.disabled = true;
  previewBtn.textContent = 'Loading Preview...';

  try {
    const route = await analyzer.getRoute(startPostcode, endPostcode, apiKey, profile);
    leafletMap.drawRoute(route.coordinates);
  } catch (error) {
    errorEl.textContent = `Route preview failed: ${error.message}`;
    errorEl.style.display = 'block';
    mapContainer.style.display = 'none';
  } finally {
    previewBtn.disabled = false;
    previewBtn.textContent = 'Preview Route';
  }
});
