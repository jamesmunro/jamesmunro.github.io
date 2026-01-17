import { CoverageAnalyzer } from './coverage-analyzer.mjs';

// Main application setup
let analyzer;
if (window.location.pathname.includes('uk-commute-coverage')) {
  analyzer = new CoverageAnalyzer();
  analyzer.init();
}

// New route preview functionality
const previewBtn = document.getElementById('preview-btn');
if (previewBtn) {
  previewBtn.addEventListener('click', async () => {
    const startPostcode = document.getElementById('start').value.trim().toUpperCase();
    const endPostcode = document.getElementById('end').value.trim().toUpperCase();
    const apiKey = document.getElementById('google-maps-api-key').value.trim();
    const profile = document.getElementById('route-profile').value;
    const errorEl = document.getElementById('error');

    // Basic input check
    if (!startPostcode || !endPostcode || !apiKey) {
      errorEl.textContent = 'Please fill in start postcode, end postcode, and Google Maps API key.';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';

    previewBtn.disabled = true;
    previewBtn.textContent = 'Loading Preview...';

    try {
      // getRoute will also load the Google Maps API if not already loaded
      const route = await analyzer.getRoute(startPostcode, endPostcode, apiKey, profile);
      
      // Initialize the map and draw the route
      analyzer.showElement('preview-container');
      await analyzer.googleMap.initMap();
      analyzer.googleMap.clearOverlays();
      
      if (route.fullResult) {
        analyzer.googleMap.setDirections(route.fullResult);
      } else {
        analyzer.googleMap.drawRoute(route.coordinates);
      }
    } catch (error) {
      errorEl.textContent = `Route preview failed: ${error.message}`;
      errorEl.style.display = 'block';
      analyzer.hideElement('preview-container');
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = 'Preview Route';
    }
  });
}
