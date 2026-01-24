import { ChartRenderer } from './chart-renderer.js';
import { TileCoverageAdapter } from './tile-coverage-adapter.js';
import { GoogleMap } from './google-map.js';
import { sampleRouteByCount } from './route-sampler.js';
import { ROUTE_SAMPLE_COUNT, STORAGE_KEYS } from './constants.js';
import type { Logger, CoverageResult, RouteResult, SampledPoint, CoverageData } from '../../types/coverage.js';

/** Configuration for CoverageAnalyzer */
interface CoverageAnalyzerConfig {
  logger?: Logger;
}

/** Travel mode mapping - lazy loaded to avoid referencing google before it's loaded */
function getTravelMode(profile: string): google.maps.TravelMode {
  const TRAVEL_MODES: Record<string, google.maps.TravelMode> = {
    'driving-car': google.maps.TravelMode.DRIVING,
    'driving-hgv': google.maps.TravelMode.DRIVING,
    'cycling-regular': google.maps.TravelMode.BICYCLING,
    'cycling-road': google.maps.TravelMode.BICYCLING,
    'foot-walking': google.maps.TravelMode.WALKING,
    'foot-hiking': google.maps.TravelMode.WALKING,
    'transit': google.maps.TravelMode.TRANSIT,
  };
  return TRAVEL_MODES[profile] || google.maps.TravelMode.DRIVING;
}

/**
 * Main Coverage Analyzer Application
 * Orchestrates the entire coverage analysis workflow
 */
export class CoverageAnalyzer {
  private logger: Logger;
  private chartRenderer: ChartRenderer;
  public googleMap: GoogleMap;
  private coverageAdapter: TileCoverageAdapter;
  private currentStep: number;
  private steps: string[];
  private googleMapsLoaded: boolean;
  private googleMapsLoadingPromise: Promise<typeof google.maps> | null;
  public currentRouteCoordinates: Array<[number, number]> | null;
  public lastRouteResult: RouteResult | null;

  constructor({ logger = console }: CoverageAnalyzerConfig = {}) {
    this.logger = logger;
    this.chartRenderer = new ChartRenderer('coverage-chart');
    this.googleMap = new GoogleMap('map-container', logger);
    this.coverageAdapter = new TileCoverageAdapter();
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
    this.googleMapsLoadingPromise = null;
    this.currentRouteCoordinates = null;
    this.lastRouteResult = null;
  }

  /**
   * Initialize the application listeners
   */
  init(): void {
    const form = document.getElementById('route-form') as HTMLFormElement | null;
    if (form) {
      this.loadFormValues();
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const tileNetworkSelect = document.getElementById('tile-network') as HTMLSelectElement | null;
    if (tileNetworkSelect) {
      tileNetworkSelect.addEventListener('change', () => {
        if (this.currentRouteCoordinates) {
          this.updateMapTiles(tileNetworkSelect.value, this.currentRouteCoordinates);
        }
      });
    }

    // Initialize cache monitor on page load (defer to ensure DOM is ready)
    setTimeout(() => this.updateCacheMonitor(), 0);
  }

  private loadFormValues(): void {
    const startInput = document.getElementById('start') as HTMLInputElement | null;
    const endInput = document.getElementById('end') as HTMLInputElement | null;
    const apiKeyInput = document.getElementById('google-maps-api-key') as HTMLInputElement | null;
    const profileInput = document.getElementById('route-profile') as HTMLSelectElement | null;
    const tileNetworkSelect = document.getElementById('tile-network') as HTMLSelectElement | null;

    if (startInput && localStorage.getItem(STORAGE_KEYS.ROUTE_START)) {
      startInput.value = localStorage.getItem(STORAGE_KEYS.ROUTE_START)!;
    }
    if (endInput && localStorage.getItem(STORAGE_KEYS.ROUTE_END)) {
      endInput.value = localStorage.getItem(STORAGE_KEYS.ROUTE_END)!;
    }
    if (apiKeyInput && localStorage.getItem(STORAGE_KEYS.GOOGLE_MAPS_API_KEY)) {
      apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.GOOGLE_MAPS_API_KEY)!;
    }
    if (profileInput && localStorage.getItem(STORAGE_KEYS.ROUTE_PROFILE)) {
      profileInput.value = localStorage.getItem(STORAGE_KEYS.ROUTE_PROFILE)!;
    }
    if (tileNetworkSelect && localStorage.getItem(STORAGE_KEYS.TILE_NETWORK)) {
      tileNetworkSelect.value = localStorage.getItem(STORAGE_KEYS.TILE_NETWORK)!;
    }
  }

  private saveFormValues(startPostcode: string, endPostcode: string, apiKey: string, profile?: string, tileNetwork?: string): void {
    localStorage.setItem(STORAGE_KEYS.ROUTE_START, startPostcode);
    localStorage.setItem(STORAGE_KEYS.ROUTE_END, endPostcode);
    localStorage.setItem(STORAGE_KEYS.GOOGLE_MAPS_API_KEY, apiKey);
    if (profile) localStorage.setItem(STORAGE_KEYS.ROUTE_PROFILE, profile);
    if (tileNetwork !== undefined) localStorage.setItem(STORAGE_KEYS.TILE_NETWORK, tileNetwork);
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    this.hideElement('chart-container');
    this.hideElement('summary');
    this.hideElement('error');

    const startPostcode = (document.getElementById('start') as HTMLInputElement).value.trim().toUpperCase();
    const endPostcode = (document.getElementById('end') as HTMLInputElement).value.trim().toUpperCase();
    const apiKey = (document.getElementById('google-maps-api-key') as HTMLInputElement).value.trim();
    const profile = (document.getElementById('route-profile') as HTMLSelectElement).value;
    const tileNetwork = (document.getElementById('tile-network') as HTMLSelectElement).value;

    this.saveFormValues(startPostcode, endPostcode, apiKey, profile, tileNetwork);

    const submitBtn = (event.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.disabled = true;

    try {
      // Check if we can reuse the last route (if it matches the current inputs)
      const lastStart = localStorage.getItem(STORAGE_KEYS.ROUTE_START);
      const lastEnd = localStorage.getItem(STORAGE_KEYS.ROUTE_END);
      const lastProfile = localStorage.getItem(STORAGE_KEYS.ROUTE_PROFILE);

      let prefetchedRoute: RouteResult | null = null;
      if (this.lastRouteResult &&
          startPostcode === lastStart &&
          endPostcode === lastEnd &&
          profile === lastProfile) {
        prefetchedRoute = {
          coordinates: this.currentRouteCoordinates!, // Use currently selected coordinates
          distance: this.lastRouteResult.distance,
          fullResult: this.lastRouteResult.fullResult
        };
      }

      await this.analyzeRoute(startPostcode, endPostcode, apiKey, profile, tileNetwork, prefetchedRoute);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : String(error));
    } finally {
      submitBtn.disabled = false;
    }
  }

  async loadGoogleMapsApi(apiKey: string): Promise<typeof google.maps> {
    // Check if already loaded globally
    if (window.google && window.google.maps) {
      this.googleMapsLoaded = true;
      return window.google.maps;
    }

    // If a loading promise already exists, wait for it
    if (this.googleMapsLoadingPromise) {
      return this.googleMapsLoadingPromise;
    }

    if (!apiKey) {
      throw new Error('Google Maps API key is required');
    }

    // Create the promise executor function first
    const promiseExecutor = (resolve: (value: typeof google.maps) => void, reject: (reason: Error) => void) => {
      // Check if a script is already in the DOM (from a previous session or external source)
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        // Wait for existing script to finish loading
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            this.googleMapsLoaded = true;
            resolve(window.google.maps);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          this.googleMapsLoadingPromise = null;
          reject(new Error('Timeout waiting for Google Maps to load'));
        }, 10000);
        return;
      }

      // Create a unique callback name to avoid conflicts
      const callbackName = '_gmapsCallback_' + Date.now();

      // Set up the callback that Google Maps will invoke when ready
      (window as unknown as Record<string, () => void>)[callbackName] = () => {
        this.googleMapsLoaded = true;
        delete (window as unknown as Record<string, () => void>)[callbackName];
        resolve(window.google.maps);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=geometry,places&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => {
        delete (window as unknown as Record<string, () => void>)[callbackName];
        this.googleMapsLoadingPromise = null;
        reject(new Error('Failed to load Google Maps API. Check your API key.'));
      };
      document.head.appendChild(script);
    };

    // Assign the promise immediately to prevent race conditions
    this.googleMapsLoadingPromise = new Promise(promiseExecutor);
    return this.googleMapsLoadingPromise;
  }

  /**
   * Fetches the route between two postcodes.
   */
  async getRoute(startPostcode: string, endPostcode: string, apiKey: string, profile = 'DRIVING'): Promise<RouteResult> {
    await this.loadGoogleMapsApi(apiKey);

    // Step 2: Validate postcodes
    this.validatePostcode(startPostcode);
    this.validatePostcode(endPostcode);

    // Step 3: For transit, pass postcodes directly so Google can find nearby stations
    // For other modes, geocode to coordinates for precision
    if (profile === 'transit') {
      return this.fetchRoute(`${startPostcode}, UK`, `${endPostcode}, UK`, profile);
    }

    const startCoords = await this.postcodeToCoordinates(startPostcode);
    const endCoords = await this.postcodeToCoordinates(endPostcode);
    return this.fetchRoute(startCoords, endCoords, profile);
  }

  async analyzeRoute(
    startPostcode: string,
    endPostcode: string,
    apiKey: string,
    profile: string,
    tileNetwork = '',
    prefetchedRoute: RouteResult | null = null
  ): Promise<void> {
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
      let route: RouteResult;
      if (prefetchedRoute) {
        this.updateProgress(30, 'Using selected route...');
        route = prefetchedRoute;
      } else {
        this.updateProgress(30, 'Fetching route from Google Directions...');
        // For transit, pass postcodes directly so Google can find nearby stations
        if (profile === 'transit') {
          route = await this.fetchRoute(`${startPostcode}, UK`, `${endPostcode}, UK`, profile);
        } else {
          route = await this.fetchRoute(startCoords, endCoords, profile);
        }
      }
      this.currentRouteCoordinates = route.coordinates;
      this.lastRouteResult = route;
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
      let sampledPoints: SampledPoint[];
      if (startPostcode === endPostcode) {
        this.updateProgress(40, 'Single postcode - sampling location...');
        const lat = Number(startCoords.lat());
        const lng = Number(startCoords.lng());
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid coordinates for single postcode sampling');
        }
        sampledPoints = [{
          lat: lat,
          lng: lng,
          distance: 0
        }];
      } else {
        sampledPoints = sampleRouteByCount(route.coordinates, ROUTE_SAMPLE_COUNT);
      }
      this.updateProgress(40, `Sampling ${sampledPoints.length} point(s) along route...`);
      this.completeStep(4);

      // Step 5: Get coverage data
      this.setStep(5);
      const coverageResults = await this.getCoverageData(sampledPoints, startPostcode, endPostcode, tileNetwork);
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

  validatePostcode(postcode: string): void {
    const pattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!pattern.test(postcode)) {
      const hasSpace = postcode.includes(' ');
      const suggestion = hasSpace ? '' : ' (missing space?)';
      throw new Error(`Invalid postcode format: ${postcode}${suggestion}`);
    }
  }

  async postcodeToCoordinates(postcode: string): Promise<google.maps.LatLng> {
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: `${postcode}, UK` }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
            reject(new Error(`Geocoding returned invalid coordinates for ${postcode}`));
            return;
          }
          resolve(location);
        } else {
          reject(new Error(`Geocoding failed for ${postcode}: ${status}`));
        }
      });
    });
  }

  async fetchRoute(start: string | google.maps.LatLng, end: string | google.maps.LatLng, profile = 'DRIVING'): Promise<RouteResult> {
    const directionsService = new google.maps.DirectionsService();

    const travelMode = getTravelMode(profile);

    return new Promise((resolve, reject) => {
      const request: google.maps.DirectionsRequest = {
        origin: start,
        destination: end,
        travelMode: travelMode,
      };

      // Alternatives are only supported for driving, walking, or cycling in the JS API
      if (travelMode !== google.maps.TravelMode.TRANSIT) {
        request.provideRouteAlternatives = true;
      } else {
        // Transit requires a departure time - use next 8am for reliable commuter results
        const now = new Date();
        const departure = new Date(now);
        departure.setHours(8, 0, 0, 0);
        if (departure <= now) {
          departure.setDate(departure.getDate() + 1);
        }
        request.transitOptions = {
          departureTime: departure,
        };
      }

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          // overview_path is an array of LatLngs for the selected route
          // By default we use the first one, but the user can now see alternatives
          const routeIndex = 0;
          const coordinates: Array<[number, number]> = result.routes[routeIndex].overview_path.map(latLng => [latLng.lng(), latLng.lat()]);
          const distance = result.routes[routeIndex].legs[0].distance?.value || 0; // in meters
          resolve({ coordinates, distance, fullResult: result });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async getCoverageData(sampledPoints: SampledPoint[], startPostcode: string, endPostcode: string, tileNetwork = ''): Promise<CoverageResult[]> {
    const results: CoverageResult[] = [];
    const BATCH_SIZE = 5;
    const DELAY_MS = 500;
    const displayedTiles = new Set<string>();

    for (let i = 0; i < sampledPoints.length; i++) {
      const point = sampledPoints[i];
      let coverage: CoverageData;
      try {
        if (isNaN(point.lat) || isNaN(point.lng)) {
          throw new Error('Invalid coordinates (NaN)');
        }

        coverage = await this.coverageAdapter.getCoverageFromCoordinates(point.lat, point.lng);

        if (tileNetwork) {
          const tileInfo = await this.coverageAdapter.getTileInfo(point.lat, point.lng, tileNetwork);
          const tileKey = `${tileInfo.tileX}-${tileInfo.tileY}`;
          if (!displayedTiles.has(tileKey)) {
            this.googleMap.addTileOverlay(tileInfo.url, tileInfo.bounds, 0.4);
            displayedTiles.add(tileKey);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to get coverage for point ${i}:`, error);
        coverage = { latitude: point.lat, longitude: point.lng, error: error instanceof Error ? error.message : String(error), networks: {} };
      }

      const result: CoverageResult = { point, coverage };

      // Attach postcodes to start and end points if provided
      if (i === 0 && startPostcode) {
        result.postcode = startPostcode;
      } else if (i === sampledPoints.length - 1 && endPostcode) {
        result.postcode = endPostcode;
      }

      results.push(result);

      const progress = 40 + (i / sampledPoints.length) * 55;
      this.updateProgress(progress, `Analyzing coverage... ${i + 1}/${sampledPoints.length} samples`);
      this.updateCacheMonitor();

      if (i < sampledPoints.length - 1 && (i + 1) % BATCH_SIZE === 0) {
        await this.sleep(DELAY_MS);
      }
    }
    return results;
  }

  async updateMapTiles(tileNetwork: string, coordinates: Array<[number, number]>): Promise<void> {
    if (!this.googleMap.map) return;

    this.googleMap.clearOverlays();
    if (!tileNetwork) return;

    const displayedTiles = new Set<string>();
    const sampledPoints = sampleRouteByCount(coordinates, ROUTE_SAMPLE_COUNT);

    for (const point of sampledPoints) {
      try {
        const tileInfo = await this.coverageAdapter.getTileInfo(point.lat, point.lng, tileNetwork);
        const tileKey = `${tileInfo.tileX}-${tileInfo.tileY}`;
        if (!displayedTiles.has(tileKey)) {
          // Fetch tile through cache to warm it, then display using object URL
          const blob = await this.coverageAdapter.fetchTile(
            tileNetwork as 'mno1' | 'mno2' | 'mno3' | 'mno4',
            tileInfo.tileX,
            tileInfo.tileY
          );
          const objectUrl = URL.createObjectURL(blob);
          this.googleMap.addTileOverlay(objectUrl, tileInfo.bounds, 0.4);
          displayedTiles.add(tileKey);
        }
      } catch (error) {
        this.logger.warn('Failed to add tile overlay:', error);
      }
    }
    this.updateCacheMonitor();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private showProgress(): void {
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

  private hideProgress(): void { this.hideElement('progress'); }

  private updateProgress(percent: number, text: string): void {
    const bar = document.getElementById('progress-bar') as HTMLProgressElement | null;
    const textEl = document.getElementById('progress-text');
    if (bar) bar.value = percent;
    if (textEl) textEl.textContent = text;
  }

  private updateCacheMonitor(): void {
    const storedEl = document.getElementById('cache-stored');
    const hitsEl = document.getElementById('cache-hits');
    if (storedEl) storedEl.textContent = `Stored: ${this.coverageAdapter.getStoredTileCount()} tiles`;
    if (hitsEl) hitsEl.textContent = `Hits: ${this.coverageAdapter.stats.tilesFromCache}`;
  }

  private setStep(stepIndex: number): void {
    const stepEl = document.getElementById(`step-${stepIndex}`);
    if (stepEl) {
      stepEl.className = 'progress-step active';
      stepEl.textContent = `⏳ ${this.steps[stepIndex]}...`;
    }
  }

  private completeStep(stepIndex: number): void {
    const stepEl = document.getElementById(`step-${stepIndex}`);
    if (stepEl) {
      stepEl.className = 'progress-step complete';
      stepEl.textContent = `✓ ${this.steps[stepIndex]}... Done`;
    }
  }

  showElement(id: string): void { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
  hideElement(id: string): void { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  showError(message: string): void {
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
}
