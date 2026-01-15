---
title: Mobile Coverage Tool
hero_subtitle: Visualize and sample mobile signal coverage along your route.
---

<style>
  .coverage-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .map-container {
    position: relative;
    height: 500px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #d4d9e6;
  }

  #coverage-map {
    width: 100%;
    height: 100%;
  }

  .controls-panel {
    background: #f6f8ff;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #d4d9e6;
  }

  .control-group {
    margin-bottom: 16px;
  }

  .control-group:last-child {
    margin-bottom: 0;
  }

  .control-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1f2a44;
  }

  .control-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d4d9e6;
    border-radius: 6px;
    font-size: 0.95rem;
  }

  .button-group {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary {
    background: #3559a2;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1f2a44;
  }

  .btn-secondary {
    background: #e4e8f0;
    color: #1f2a44;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d4d9e6;
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background: #059669;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .route-info {
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #e4e8f0;
  }

  .route-info h3 {
    margin: 0 0 8px 0;
    font-size: 1rem;
    color: #1f2a44;
  }

  .route-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    font-size: 0.9rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    color: #56637e;
  }

  .stat-value {
    font-weight: 600;
    color: #1f2a44;
  }

  .results-panel {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #d4d9e6;
  }

  .results-panel h3 {
    margin: 0 0 16px 0;
    color: #1f2a44;
  }

  .coverage-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .summary-card {
    background: #f6f8ff;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
  }

  .summary-label {
    font-size: 0.85rem;
    color: #56637e;
    margin-bottom: 4px;
  }

  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2a44;
  }

  .coverage-excellent {
    color: #10b981;
  }

  .coverage-good {
    color: #3b82f6;
  }

  .coverage-fair {
    color: #f59e0b;
  }

  .coverage-poor {
    color: #ef4444;
  }

  .progress-bar {
    width: 100%;
    height: 24px;
    background: #e4e8f0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3559a2, #3b82f6);
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .status-message {
    text-align: center;
    color: #56637e;
    font-size: 0.9rem;
    font-style: italic;
  }

  .hidden {
    display: none;
  }
</style>

<section class="card" aria-labelledby="coverage-title">
  <div class="coverage-container">
    <div class="map-container">
      <div id="coverage-map"></div>
    </div>

    <div class="controls-panel">
      <div class="control-group">
        <label>Instructions:</label>
        <p style="margin: 0; color: #56637e; font-size: 0.9rem;">
          Click on the map to add waypoints for your route. The route is visualized as you build it. Add at least 2 points, then review the route details and click "Confirm Route & Start Sampling".
        </p>
      </div>

      <div id="route-info-container" class="hidden">
        <div class="route-info">
          <h3>Route Details</h3>
          <div class="route-stats">
            <div class="stat-item">
              <span>Waypoints:</span>
              <span class="stat-value" id="waypoint-count">0</span>
            </div>
            <div class="stat-item">
              <span>Distance:</span>
              <span class="stat-value" id="route-distance">0 km</span>
            </div>
            <div class="stat-item">
              <span>Sample Points:</span>
              <span class="stat-value">150</span>
            </div>
            <div class="stat-item">
              <span>Sample Spacing:</span>
              <span class="stat-value" id="sample-spacing">~0 m</span>
            </div>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn btn-primary" id="confirm-route-btn" disabled>Confirm Route & Start Sampling</button>
        <button class="btn btn-secondary" id="clear-route-btn">Clear Route</button>
      </div>
    </div>

    <div id="results-container" class="hidden">
      <div class="results-panel">
        <h3>Coverage Results</h3>

        <div id="sampling-progress" class="hidden">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill">0%</div>
          </div>
          <p class="status-message" id="progress-status">Initializing...</p>
        </div>

        <div id="coverage-results" class="hidden">
          <div class="coverage-summary">
            <div class="summary-card">
              <div class="summary-label">Excellent</div>
              <div class="summary-value coverage-excellent" id="excellent-count">0</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Good</div>
              <div class="summary-value coverage-good" id="good-count">0</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Fair</div>
              <div class="summary-value coverage-fair" id="fair-count">0</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Poor</div>
              <div class="summary-value coverage-poor" id="poor-count">0</div>
            </div>
          </div>
          <p style="color: #56637e; font-size: 0.9rem; margin: 16px 0 0;">
            Coverage quality is visualized on the map with color-coded markers.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="card" aria-labelledby="coverage-notes">
  <h2 id="coverage-notes">Notes</h2>
  <ul>
    <li><strong>Route Creation:</strong> Click on the map to add waypoints to your route. The route is visualized in real-time so you can verify it before sampling.</li>
    <li><strong>Adaptive Sampling:</strong> The tool generates exactly 150 sample points along your route, regardless of length. Sample spacing adapts automatically (short routes = closer samples, long routes = wider spacing).</li>
    <li><strong>Preview First:</strong> Review the route visualization and sample spacing before clicking "Confirm Route & Start Sampling".</li>
    <li><strong>Coverage Data:</strong> Coverage data is simulated for demonstration purposes. Integrate with real APIs for production use.</li>
    <li><strong>Color Coding:</strong> Green (Excellent), Blue (Good), Orange (Fair), Red (Poor).</li>
  </ul>
</section>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script type="module">
  import {
    calculateRouteDistance,
    interpolateRoute,
    simulateCoverageSample
  } from './mobile-coverage.js';

  // Initialize map
  const map = L.map('coverage-map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // State
  let waypoints = [];
  let waypointMarkers = [];
  let routeLine = null;
  let sampleMarkers = [];
  let isConfirmed = false;

  // DOM elements
  const confirmBtn = document.getElementById('confirm-route-btn');
  const clearBtn = document.getElementById('clear-route-btn');
  const routeInfoContainer = document.getElementById('route-info-container');
  const waypointCount = document.getElementById('waypoint-count');
  const routeDistance = document.getElementById('route-distance');
  const sampleSpacing = document.getElementById('sample-spacing');
  const resultsContainer = document.getElementById('results-container');
  const samplingProgress = document.getElementById('sampling-progress');
  const coverageResults = document.getElementById('coverage-results');
  const progressFill = document.getElementById('progress-fill');
  const progressStatus = document.getElementById('progress-status');

  // Add waypoint on map click
  map.on('click', (e) => {
    if (isConfirmed) return;

    const { lat, lng } = e.latlng;
    waypoints.push([lat, lng]);

    // Add marker
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'waypoint-marker',
        html: `<div style="background: #3559a2; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${waypoints.length}</div>`,
        iconSize: [28, 28]
      })
    }).addTo(map);
    waypointMarkers.push(marker);

    updateRoute();
  });

  function updateRoute() {
    // Remove old route line
    if (routeLine) {
      map.removeLayer(routeLine);
    }

    if (waypoints.length >= 2) {
      // Draw route line
      routeLine = L.polyline(waypoints, {
        color: '#3559a2',
        weight: 4,
        opacity: 0.7
      }).addTo(map);

      // Calculate distance
      const distance = calculateRouteDistance(waypoints);

      // Calculate adaptive sample spacing (distance between samples)
      const spacingKm = distance / 150;
      const spacingM = spacingKm * 1000;
      const spacingText = spacingM >= 1000
        ? `~${(spacingKm).toFixed(2)} km`
        : `~${Math.round(spacingM)} m`;

      // Update UI
      routeInfoContainer.classList.remove('hidden');
      waypointCount.textContent = waypoints.length;
      routeDistance.textContent = `${distance.toFixed(2)} km`;
      sampleSpacing.textContent = spacingText;
      confirmBtn.disabled = false;

      // Fit map to route
      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    } else {
      routeInfoContainer.classList.add('hidden');
      confirmBtn.disabled = true;
    }
  }

  function clearRoute() {
    // Remove markers
    waypointMarkers.forEach(marker => map.removeLayer(marker));
    waypointMarkers = [];

    // Remove route line
    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    // Remove sample markers
    sampleMarkers.forEach(marker => map.removeLayer(marker));
    sampleMarkers = [];

    // Reset state
    waypoints = [];
    isConfirmed = false;
    routeInfoContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    confirmBtn.disabled = true;
  }

  async function startSampling() {
    isConfirmed = true;
    confirmBtn.disabled = true;
    clearBtn.disabled = true;
    resultsContainer.classList.remove('hidden');
    samplingProgress.classList.remove('hidden');
    coverageResults.classList.add('hidden');

    // Generate 150 sample points using linear interpolation
    const samplePoints = interpolateRoute(waypoints, 150);

    // Coverage counters
    const coverageCounts = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    // Sample coverage at each point
    for (let i = 0; i < samplePoints.length; i++) {
      const point = samplePoints[i];
      const coverage = simulateCoverageSample(point);

      // Update counter
      coverageCounts[coverage.quality]++;

      // Add marker with color based on quality
      const colors = {
        excellent: '#10b981',
        good: '#3b82f6',
        fair: '#f59e0b',
        poor: '#ef4444'
      };

      const marker = L.circleMarker(point, {
        radius: 4,
        fillColor: colors[coverage.quality],
        color: 'white',
        weight: 1,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <strong>Sample ${i + 1}</strong><br>
        Signal: ${coverage.signal} dBm<br>
        Quality: ${coverage.quality.charAt(0).toUpperCase() + coverage.quality.slice(1)}
      `);

      sampleMarkers.push(marker);

      // Update progress
      const progress = Math.round(((i + 1) / samplePoints.length) * 100);
      progressFill.style.width = `${progress}%`;
      progressFill.textContent = `${progress}%`;
      progressStatus.textContent = `Sampling point ${i + 1} of ${samplePoints.length}...`;

      // Small delay for visualization (remove in production)
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Show results
    samplingProgress.classList.add('hidden');
    coverageResults.classList.remove('hidden');
    document.getElementById('excellent-count').textContent = coverageCounts.excellent;
    document.getElementById('good-count').textContent = coverageCounts.good;
    document.getElementById('fair-count').textContent = coverageCounts.fair;
    document.getElementById('poor-count').textContent = coverageCounts.poor;

    clearBtn.disabled = false;
  }

  // Event listeners
  confirmBtn.addEventListener('click', startSampling);
  clearBtn.addEventListener('click', clearRoute);
</script>
