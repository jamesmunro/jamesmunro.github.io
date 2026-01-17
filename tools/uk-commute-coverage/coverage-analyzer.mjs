import { ChartRenderer } from './chart-renderer.mjs';
import { TileCoverageAdapter } from './tile-coverage-adapter.mjs';
import { GoogleMap } from './google-map.mjs';
import { sampleRouteByCount } from './route-sampler.mjs';
import { ROUTE_SAMPLE_COUNT } from './constants.mjs';

/**
 * Main Coverage Analyzer Application
 * Orchestrates the entire coverage analysis workflow
 */
export class CoverageAnalyzer {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.chartRenderer = new ChartRenderer('coverage-chart');
    this.googleMap = new GoogleMap('map-container', logger);
    this.coverageAdapter = null;
    this.currentStep = 0;
    this.steps = [
      'Loading Google Maps API',
      'Validating postcodes',
      'Converting postcodes to coordinates',
      'Fetching route from Google Directions',
      'Sampling points along route',
      'Getting coverage data'
    ];
    this.googleMapsLoaded = false;
  }

  /**
   * Initialize the application listeners
   */
  init() {
    const form = document.getElementById('route-form');
    if (form) {
      this.loadFormValues();
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  loadFormValues() {
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    const apiKeyInput = document.getElementById('google-maps-api-key');
    const profileInput = document.getElementById('route-profile');
    const showTilesInput = document.getElementById('show-tiles');

    if (startInput && localStorage.getItem('route-start')) {
      startInput.value = localStorage.getItem('route-start');
    }
    if (endInput && localStorage.getItem('route-end')) {
      endInput.value = localStorage.getItem('route-end');
    }
    if (apiKeyInput && localStorage.getItem('google-maps-api-key')) {
      apiKeyInput.value = localStorage.getItem('google-maps-api-key');
    }
    if (profileInput && localStorage.getItem('route-profile')) {
      profileInput.value = localStorage.getItem('route-profile');
    }
    if (showTilesInput && localStorage.getItem('show-tiles')) {
      showTilesInput.checked = localStorage.getItem('show-tiles') === 'true';
    }
  }

  saveFormValues(startPostcode, endPostcode, apiKey, profile) {
    localStorage.setItem('route-start', startPostcode);
    localStorage.setItem('route-end', endPostcode);
    localStorage.setItem('google-maps-api-key', apiKey);
    if (profile) localStorage.setItem('route-profile', profile);
  }

  async handleSubmit(event) {
    event.preventDefault();

    this.hideElement('chart-container');
    this.hideElement('summary');
    this.hideElement('error');

    const startPostcode = document.getElementById('start').value.trim().toUpperCase();
    const endPostcode = document.getElementById('end').value.trim().toUpperCase();
    const apiKey = document.getElementById('google-maps-api-key').value.trim();
    const profile = document.getElementById('route-profile').value;
    const showTiles = document.getElementById('show-tiles').checked;

    this.saveFormValues(startPostcode, endPostcode, apiKey, profile);
    localStorage.setItem('show-tiles', showTiles);

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await this.analyzeRoute(startPostcode, endPostcode, apiKey, profile, showTiles);
    } catch (error) {
      this.showError(error.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  async loadGoogleMapsApi(apiKey) {
    if (this.googleMapsLoaded && window.google && window.google.maps) {
      return window.google.maps;
    }

    if (!apiKey) {
      throw new Error('Google Maps API key is required');
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.googleMapsLoaded = true;
        resolve(window.google.maps);
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps API. Check your API key.'));
      document.head.appendChild(script);
    });
  }

  /**
   * Fetches the route between two postcodes.
   */
  async getRoute(startPostcode, endPostcode, apiKey, profile = 'DRIVING') {
    await this.loadGoogleMapsApi(apiKey);

    // Step 2: Validate postcodes
    this.validatePostcode(startPostcode);
    this.validatePostcode(endPostcode);

    // Step 3: Convert postcodes to coordinates
    const startCoords = await this.postcodeToCoordinates(startPostcode);
    const endCoords = await this.postcodeToCoordinates(endPostcode);

    // Step 4: Fetch route
    return this.fetchRoute(startCoords, endCoords, profile);
  }

  async analyzeRoute(startPostcode, endPostcode, apiKey, profile, showTiles = false) {
    this.showProgress();
    this.updateProgress(0, 'Initializing...');

    try {
      this.setStep(0);
      this.updateProgress(5, 'Loading Google Maps API...');
      await this.loadGoogleMapsApi(apiKey);
      this.completeStep(0);

      this.setStep(1);
      this.updateProgress(10, 'Validating postcodes...');
      this.validatePostcode(startPostcode);
      this.validatePostcode(endPostcode);
      this.completeStep(1);

      this.setStep(2);
      this.updateProgress(20, 'Converting postcodes to coordinates...');
      const startCoords = await this.postcodeToCoordinates(startPostcode);
      const endCoords = await this.postcodeToCoordinates(endPostcode);
      this.completeStep(2);

      this.setStep(3);
      this.updateProgress(30, 'Fetching route from Google Directions...');
      const route = await this.fetchRoute(startCoords, endCoords, profile);
      this.completeStep(3);

      // Initialize map and draw route
      this.showElement('preview-container');
      await this.googleMap.initMap();
      this.googleMap.clearOverlays();

      if (route.fullResult) {
        this.googleMap.setDirections(route.fullResult);
      } else {
        this.googleMap.drawRoute(route.coordinates);
      }

      // Step 4: Sample route
      this.setStep(4);
      let sampledPoints;
      if (startPostcode === endPostcode) {
        this.updateProgress(40, 'Single postcode - sampling location...');
        sampledPoints = [{
          lat: startCoords.lat(),
          lng: startCoords.lng(),
          distance: 0
        }];
      } else {
        sampledPoints = sampleRouteByCount(route.coordinates, ROUTE_SAMPLE_COUNT);
      }
      this.updateProgress(40, `Sampling ${sampledPoints.length} point(s) along route...`);
      this.completeStep(4);

      // Step 5: Get coverage data
      this.setStep(5);
      this.coverageAdapter = new TileCoverageAdapter();
      const coverageResults = await this.getCoverageData(sampledPoints, startPostcode, endPostcode, showTiles);
      this.completeStep(5);

      // Render results
      this.updateProgress(95, 'Rendering results...');
      this.chartRenderer.render(coverageResults);
      this.chartRenderer.renderSummary(coverageResults, 'summary-body');

      this.updateProgress(100, 'Complete!');
      this.hideProgress();
      this.showElement('chart-container');
      this.showElement('summary');

    } catch (error) {
      this.hideProgress();
      throw error;
    }
  }

  validatePostcode(postcode) {
    const pattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!pattern.test(postcode)) {
      const hasSpace = postcode.includes(' ');
      const suggestion = hasSpace ? '' : ' (missing space?)';
      throw new Error(`Invalid postcode format: ${postcode}${suggestion}`);
    }
  }

  async postcodeToCoordinates(postcode) {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: `${postcode}, UK` }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve(results[0].geometry.location);
        } else {
          reject(new Error(`Geocoding failed for ${postcode}: ${status}`));
        }
      });
    });
  }

  async fetchRoute(start, end, profile = 'DRIVING') {
    const directionsService = new google.maps.DirectionsService();
    
    // Map internal profile names to Google Travel Modes
    const modeMap = {
      'driving-car': google.maps.TravelMode.DRIVING,
      'driving-hgv': google.maps.TravelMode.DRIVING,
      'cycling-regular': google.maps.TravelMode.BICYCLING,
      'cycling-road': google.maps.TravelMode.BICYCLING,
      'foot-walking': google.maps.TravelMode.WALKING,
      'foot-hiking': google.maps.TravelMode.WALKING,
      'transit': google.maps.TravelMode.TRANSIT,
    };
    
    const travelMode = modeMap[profile] || google.maps.TravelMode.DRIVING;

    return new Promise((resolve, reject) => {
      directionsService.route({
        origin: start,
        destination: end,
        travelMode: travelMode,
      }, (result, status) => {
        if (status === 'OK') {
          // overview_path is an array of LatLngs
          const coordinates = result.routes[0].overview_path.map(latLng => [latLng.lng(), latLng.lat()]);
          const distance = result.routes[0].legs[0].distance.value; // in meters
          resolve({ coordinates, distance, fullResult: result });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async getCoverageData(sampledPoints, startPostcode, endPostcode, showTiles = false) {
    const results = [];
    const BATCH_SIZE = 5;
    const DELAY_MS = 500;
    const displayedTiles = new Set();

    for (let i = 0; i < sampledPoints.length; i++) {
      const point = sampledPoints[i];
      let coverage = null;
      try {
        coverage = await this.coverageAdapter.getCoverageFromCoordinates(point.lat, point.lng);
        
        if (showTiles) {
          // Use mno3 (EE) as the default for tile display
          const tileInfo = await this.coverageAdapter.getTileInfo(point.lat, point.lng, 'mno3');
          const tileKey = `${tileInfo.tileX}-${tileInfo.tileY}`;
          if (!displayedTiles.has(tileKey)) {
            this.googleMap.addTileOverlay(tileInfo.url, tileInfo.bounds, 0.4);
            displayedTiles.add(tileKey);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to get coverage for point ${i}:`, error);
        coverage = { latitude: point.lat, longitude: point.lng, error: error.message, networks: {} };
      }
      
      const result = { point, coverage };
      
      // Attach postcodes to start and end points if provided
      if (i === 0 && startPostcode) {
        result.postcode = startPostcode;
      } else if (i === sampledPoints.length - 1 && endPostcode) {
        result.postcode = endPostcode;
      }
      
      results.push(result);

      const progress = 40 + (i / sampledPoints.length) * 55;
      const stats = `Tiles: ${this.coverageAdapter.stats.tilesFetched} fetched / ${this.coverageAdapter.stats.tilesFromCache} cached`;
      this.updateProgress(progress, `Analyzing coverage... ${i + 1}/${sampledPoints.length} samples`, stats);

      if (i < sampledPoints.length - 1 && (i + 1) % BATCH_SIZE === 0) {
        await this.sleep(DELAY_MS);
      }
    }
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showProgress() {
    const container = document.getElementById('progress');
    if (container) {
      container.style.display = 'block';
      const stepsContainer = document.getElementById('progress-steps');
      if (stepsContainer) {
        stepsContainer.innerHTML = this.steps.map((step, i) =>
          `<div class="progress-step pending" id="step-${i}">⏳ ${step}...</div>`
        ).join('');
      }
    }
  }

  hideProgress() { this.hideElement('progress'); }
  updateProgress(percent, text, stats = null) {
    const bar = document.getElementById('progress-bar');
    const textEl = document.getElementById('progress-text');
    const statsEl = document.getElementById('stats-text');
    if (bar) bar.value = percent;
    if (textEl) textEl.textContent = text;
    if (statsEl && stats) {
      statsEl.textContent = stats;
    } else if (statsEl) {
      statsEl.textContent = '';
    }
  }

  setStep(stepIndex) {
    const stepEl = document.getElementById(`step-${stepIndex}`);
    if (stepEl) {
      stepEl.className = 'progress-step active';
      stepEl.textContent = `⏳ ${this.steps[stepIndex]}...`;
    }
  }

  completeStep(stepIndex) {
    const stepEl = document.getElementById(`step-${stepIndex}`);
    if (stepEl) {
      stepEl.className = 'progress-step complete';
      stepEl.textContent = `✓ ${this.steps[stepIndex]}... Done`;
    }
  }

  showElement(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
  hideElement(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  showError(message) {
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('uk-commute-coverage')) {
      const form = document.getElementById('route-form');
      if (form) {
        const analyzer = new CoverageAnalyzer();
        analyzer.init();
      }
    }
  });
} else if (typeof document !== 'undefined') {
  if (window.location.pathname.includes('uk-commute-coverage')) {
    const form = document.getElementById('route-form');
    if (form) {
      const analyzer = new CoverageAnalyzer();
      analyzer.init();
    }
  }
}