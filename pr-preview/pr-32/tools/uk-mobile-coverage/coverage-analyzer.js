/**
 * Main Coverage Analyzer Application
 * Orchestrates the entire coverage analysis workflow
 */

class CoverageAnalyzer {
  constructor() {
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
   * Initialize the application
   */
  init() {
    const form = document.getElementById('route-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    // Hide previous results/errors
    this.hideElement('chart-container');
    this.hideElement('summary');
    this.hideElement('error');

    // Get form values
    const startPostcode = document.getElementById('start').value.trim().toUpperCase();
    const endPostcode = document.getElementById('end').value.trim().toUpperCase();
    const apiKey = document.getElementById('ors-api-key').value.trim();
    const dataSource = document.getElementById('data-source').value;

    // Disable form
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await this.analyzeRoute(startPostcode, endPostcode, apiKey, dataSource);
    } catch (error) {
      this.showError(error.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  /**
   * Main analysis workflow
   */
  async analyzeRoute(startPostcode, endPostcode, apiKey, dataSource) {
    this.showProgress();
    this.updateProgress(0, 'Initializing...');

    try {
      // Step 1: Validate postcodes
      this.setStep(0);
      this.updateProgress(10, 'Validating postcodes...');
      this.validatePostcode(startPostcode);
      this.validatePostcode(endPostcode);
      this.completeStep(0);

      // Step 2: Convert postcodes to coordinates
      this.setStep(1);
      this.updateProgress(20, 'Converting postcodes to coordinates...');
      const startCoords = await this.postcodeToCoordinates(startPostcode);
      const endCoords = await this.postcodeToCoordinates(endPostcode);
      this.completeStep(1);

      // Step 3: Fetch route
      this.setStep(2);
      this.updateProgress(30, 'Fetching route from OpenRouteService...');
      const route = await this.fetchRoute(startCoords, endCoords, apiKey);
      this.completeStep(2);

      // Step 4: Sample route
      this.setStep(3);
      const sampledPoints = sampleRouteByCount(route.coordinates, 150);
      this.updateProgress(40, `Sampling ${sampledPoints.length} points along route...`);
      this.completeStep(3);

      // Step 5: Get coverage data
      this.setStep(4);
      this.coverageAdapter = new CoverageAdapter(dataSource);
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

  /**
   * Validate UK postcode format
   */
  validatePostcode(postcode) {
    const pattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!pattern.test(postcode)) {
      const hasSpace = postcode.includes(' ');
      const suggestion = hasSpace ? '' : ' (missing space?)';
      throw new Error(`Invalid postcode format: ${postcode}${suggestion}`);
    }
  }

  /**
   * Convert postcode to coordinates using Postcodes.io
   */
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

  /**
   * Fetch route from OpenRouteService
   */
  async fetchRoute(start, end, apiKey) {
    if (!apiKey) {
      throw new Error('OpenRouteService API key required');
    }

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid OpenRouteService API key');
        }
        if (response.status === 404) {
          throw new Error('Route not found between these postcodes');
        }
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

  /**
   * Get coverage data for all sampled points
   */
  async getCoverageData(sampledPoints) {
    const results = [];
    const BATCH_SIZE = 10;
    const DELAY_MS = 1000;

    // First, convert all points to postcodes
    const pointsWithPostcodes = [];
    for (let i = 0; i < sampledPoints.length; i++) {
      const point = sampledPoints[i];

      try {
        const postcode = await this.coordinatesToPostcode(point.lat, point.lng);
        pointsWithPostcodes.push({ point, postcode });
      } catch (error) {
        // If postcode lookup fails, skip this point
        console.warn(`Failed to get postcode for ${point.lat}, ${point.lng}:`, error);
        pointsWithPostcodes.push({ point, postcode: null });
      }

      // Update progress
      const progress = 40 + (i / sampledPoints.length) * 20;
      this.updateProgress(progress, `Getting coverage data... ${i + 1}/${sampledPoints.length} postcodes`);

      // Rate limiting for postcode API
      if (i < sampledPoints.length - 1 && i % BATCH_SIZE === BATCH_SIZE - 1) {
        await this.sleep(DELAY_MS);
      }
    }

    // Cache for postcodes we've already queried
    const coverageCache = {};

    // Now fetch coverage data
    for (let i = 0; i < pointsWithPostcodes.length; i++) {
      const { point, postcode } = pointsWithPostcodes[i];

      let coverage = null;

      if (postcode) {
        // Check cache first
        if (coverageCache[postcode]) {
          coverage = coverageCache[postcode];
        } else {
          try {
            coverage = await this.coverageAdapter.getCoverage(postcode);
            coverageCache[postcode] = coverage;
          } catch (error) {
            console.warn(`Failed to get coverage for ${postcode}:`, error);
          }
        }
      }

      results.push({ point, postcode, coverage });

      // Update progress
      const progress = 60 + (i / pointsWithPostcodes.length) * 35;
      this.updateProgress(progress, `Analyzing coverage... ${i + 1}/${pointsWithPostcodes.length} points`);

      // Rate limiting for coverage API
      if (i < pointsWithPostcodes.length - 1 && i % BATCH_SIZE === BATCH_SIZE - 1) {
        await this.sleep(DELAY_MS);
      }
    }

    return results;
  }

  /**
   * Convert coordinates to postcode using Postcodes.io reverse geocoding
   */
  async coordinatesToPostcode(lat, lng) {
    const url = `https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.status !== 200 || !data.result || data.result.length === 0) {
        throw new Error('No postcode found for coordinates');
      }

      return data.result[0].postcode;
    } catch (error) {
      throw new Error(`Failed to reverse geocode: ${error.message}`);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Progress management
   */
  showProgress() {
    const container = document.getElementById('progress');
    if (container) {
      container.style.display = 'block';

      // Create step indicators
      const stepsContainer = document.getElementById('progress-steps');
      if (stepsContainer) {
        stepsContainer.innerHTML = this.steps.map((step, i) =>
          `<div class="progress-step pending" id="step-${i}">⏳ ${step}...</div>`
        ).join('');
      }
    }
  }

  hideProgress() {
    this.hideElement('progress');
  }

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

  /**
   * UI helpers
   */
  showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }

  hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  showError(message) {
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new CoverageAnalyzer();
    analyzer.init();
  });
} else {
  const analyzer = new CoverageAnalyzer();
  analyzer.init();
}
