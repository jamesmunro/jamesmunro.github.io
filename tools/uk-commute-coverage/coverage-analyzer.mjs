import { ChartRenderer } from './chart-renderer.mjs';
import { TileCoverageAdapter } from './tile-coverage-adapter.mjs';
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
    this.coverageAdapter = null;
    this.currentStep = 0;
    this.steps = [
      'Validating postcodes',
      'Converting postcodes to coordinates',
      'Fetching route from OpenRouteService',
      'Sampling points along route',
      'Getting coverage data'
    ];
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
    const apiKeyInput = document.getElementById('ors-api-key');

    if (startInput && localStorage.getItem('route-start')) {
      startInput.value = localStorage.getItem('route-start');
    }
    if (endInput && localStorage.getItem('route-end')) {
      endInput.value = localStorage.getItem('route-end');
    }
    if (apiKeyInput && localStorage.getItem('ors-api-key')) {
      apiKeyInput.value = localStorage.getItem('ors-api-key');
    }
  }

  saveFormValues(startPostcode, endPostcode, apiKey) {
    localStorage.setItem('route-start', startPostcode);
    localStorage.setItem('route-end', endPostcode);
    localStorage.setItem('ors-api-key', apiKey);
  }

  async handleSubmit(event) {
    event.preventDefault();

    this.hideElement('chart-container');
    this.hideElement('summary');
    this.hideElement('error');

    const startPostcode = document.getElementById('start').value.trim().toUpperCase();
    const endPostcode = document.getElementById('end').value.trim().toUpperCase();
    const apiKey = document.getElementById('ors-api-key').value.trim();

    this.saveFormValues(startPostcode, endPostcode, apiKey);

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await this.analyzeRoute(startPostcode, endPostcode, apiKey);
    } catch (error) {
      this.showError(error.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  /**
   * Fetches the route between two postcodes.
   * This is a separate method so it can be used for visualization before full analysis.
   */
  async getRoute(startPostcode, endPostcode, apiKey) {
    // Step 1: Validate postcodes
    this.validatePostcode(startPostcode);
    this.validatePostcode(endPostcode);

    // Step 2: Convert postcodes to coordinates
    const startCoords = await this.postcodeToCoordinates(startPostcode);
    const endCoords = await this.postcodeToCoordinates(endPostcode);

    // Step 3: Fetch route
    return this.fetchRoute(startCoords, endCoords, apiKey);
  }

  async analyzeRoute(startPostcode, endPostcode, apiKey) {
    this.showProgress();
    this.updateProgress(0, 'Initializing...');

    try {
      this.setStep(0);
      this.updateProgress(10, 'Validating postcodes...');
      this.completeStep(0); // Visually completes validation step

      this.setStep(1);
      this.updateProgress(20, 'Converting postcodes to coordinates...');
      this.completeStep(1); // Visually completes geocoding step

      this.setStep(2);
      this.updateProgress(30, 'Fetching route from OpenRouteService...');
      const route = await this.getRoute(startPostcode, endPostcode, apiKey);
      this.completeStep(2);

      // Step 4: Sample route
      this.setStep(3);
      let sampledPoints;
      if (startPostcode === endPostcode) {
        this.updateProgress(40, 'Single postcode - sampling location...');
        const startCoords = await this.postcodeToCoordinates(startPostcode);
        sampledPoints = [{
          lat: startCoords.latitude,
          lng: startCoords.longitude,
          distance: 0
        }];
      } else {
        sampledPoints = sampleRouteByCount(route.coordinates, ROUTE_SAMPLE_COUNT);
      }
      this.updateProgress(40, `Sampling ${sampledPoints.length} point(s) along route...`);
      this.completeStep(3);

      // Step 5: Get coverage data
      this.setStep(4);
      this.coverageAdapter = new TileCoverageAdapter();
      const coverageResults = await this.getCoverageData(sampledPoints);
      this.completeStep(4);

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
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data.status !== 200) {
        throw new Error(`Postcode not found: ${postcode}`);
      }
      return {
        longitude: data.result.longitude,
        latitude: data.result.latitude
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to geocode postcode ${postcode}: ${error.message}`);
    }
  }

  async fetchRoute(start, end, apiKey) {
    if (!apiKey) {
      throw new Error('OpenRouteService API key required');
    }
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid OpenRouteService API key');
        if (response.status === 404) throw new Error('Route not found between these postcodes');
        throw new Error(`Route request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.features || !data.features[0] || !data.features[0].geometry) {
        throw new Error('Invalid route response from OpenRouteService');
      }
      return {
        coordinates: data.features[0].geometry.coordinates,
        distance: data.features[0].properties.segments[0].distance
      };
    } catch (error) {
      if (error.message.includes('API key') || error.message.includes('Route not found')) {
        throw error;
      }
      throw new Error(`Failed to fetch route: ${error.message}`);
    }
  }

  async getCoverageData(sampledPoints) {
    const results = [];
    const BATCH_SIZE = 5;
    const DELAY_MS = 500;

    for (let i = 0; i < sampledPoints.length; i++) {
      const point = sampledPoints[i];
      let coverage = null;
      try {
        coverage = await this.coverageAdapter.getCoverageFromCoordinates(point.lat, point.lng);
      } catch (error) {
        this.logger.warn(`Failed to get coverage for point ${i}:`, error);
        coverage = { latitude: point.lat, longitude: point.lng, error: error.message, networks: {} };
      }
      results.push({ point, coverage });

      const progress = 40 + (i / sampledPoints.length) * 55;
      this.updateProgress(progress, `Analyzing coverage... ${i + 1}/${sampledPoints.length} points`);

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
  updateProgress(percent, text) {
    const bar = document.getElementById('progress-bar');
    const textEl = document.getElementById('progress-text');
    if (bar) bar.value = percent;
    if (textEl) textEl.textContent = text;
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
      const analyzer = new CoverageAnalyzer();
      analyzer.init();
    }
  });
} else if (typeof document !== 'undefined') {
  if (window.location.pathname.includes('uk-commute-coverage')) {
    const analyzer = new CoverageAnalyzer();
    analyzer.init();
  }
}
