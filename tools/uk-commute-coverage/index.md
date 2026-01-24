---
title: UK Commute Coverage Analyser
hero_subtitle: Find the best network for your commute by analysing mobile data coverage along your route
---

<div class="coverage-tool">
  <div class="intro">
    <p>Compare mobile coverage from EE, Vodafone, O2, and Three along any UK route. Uses Ofcom coverage tiles to analyse signal strength at 500 evenly-spaced points. Perfect for finding the best network for your commute.</p>
    <p><strong>How it works:</strong> Enter your route, and we'll fetch Ofcom's official coverage data and sample it along your journey. Results show coverage quality levels for each network.</p>
  </div>

  <form id="route-form">
    <div class="form-group">
      <label for="start">Start Postcode</label>
      <input type="text" id="start" placeholder="e.g., SW1A 1AA" required pattern="[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}" autocomplete="off">
      <small>UK postcode format (e.g., SW1A 1AA)</small>
    </div>

    <div class="form-group">
      <label for="end">End Postcode</label>
      <input type="text" id="end" placeholder="e.g., EC2N 2DB" required pattern="[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}" autocomplete="off">
      <small>UK postcode format (e.g., EC2N 2DB)</small>
    </div>

    <div class="form-group">
      <label for="route-profile">Travel Mode</label>
      <select id="route-profile">
        <option value="driving-car">Driving (Car)</option>
        <option value="transit">Public Transport (Bus/Train)</option>
        <option value="cycling-regular">Cycling</option>
        <option value="foot-walking">Walking</option>
      </select>
    </div>

    <div class="form-group">
      <label for="google-maps-api-key">Google Maps API Key</label>
      <input type="text" id="google-maps-api-key" placeholder="Enter your Google Maps API Key" required autocomplete="off">
      <small>Requires Geocoding, Directions, and Maps JavaScript APIs | <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener">Get a key here</a></small>
    </div>

    <div class="form-group">
      <label for="tile-network">Show coverage tiles on map</label>
      <select id="tile-network">
        <option value="">None</option>
        <option value="mno3">EE</option>
        <option value="mno1">Vodafone</option>
        <option value="mno2">O2</option>
        <option value="mno4">Three</option>
      </select>
      <small>Select a network to overlay its coverage tiles on the map</small>
    </div>

    <div class="button-group">
      <button type="button" id="preview-btn" class="btn-primary">Preview Route</button>
      <button type="submit" class="btn-primary">Analyse Route Coverage</button>
    </div>
    <small style="display:block; text-align:center; margin-top:0.5rem; color:var(--text-secondary);">Route sampled at 500 evenly-spaced points using Ofcom coverage tiles</small>
  </form>

  <!-- Route Preview Map -->
  <div id="preview-container" style="display:none;">
    <div id="route-options-container" style="margin-bottom: 1rem;">
      <p><small><strong>Select typical route:</strong></small></p>
      <div id="route-options" style="display: flex; gap: 0.5rem; flex-wrap: wrap;"></div>
    </div>
    <div id="map-container" style="height: 400px; margin: 1rem 0;"></div>
  </div>

  <!-- Step-by-Step Progress Indicator -->
  <div id="progress" class="progress-container" style="display:none">
    <div id="progress-steps"></div>
    <progress id="progress-bar" max="100" value="0"></progress>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
      <span id="progress-text">Initializing...</span>
      <span id="stats-text" style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;"></span>
    </div>
  </div>

  <!-- Chart Canvas -->
  <div id="chart-container" style="display:none">
    <h3>Coverage Along Route</h3>
    <div style="height: 400px; position: relative;">
      <canvas id="coverage-chart"></canvas>
    </div>
  </div>

  <!-- Network Comparison Summary -->
  <div id="summary" style="display:none">
    <h3>Route Coverage Summary</h3>
    <table class="coverage-table">
      <thead>
        <tr>
          <th>Network</th>
          <th>Indoor+</th>
          <th>Outdoor+</th>
          <th>Variable+</th>
          <th>Poor/None</th>
          <th>Rank</th>
        </tr>
      </thead>
      <tbody id="summary-body">
        <!-- Populated dynamically with percentages -->
      </tbody>
    </table>
    <div class="coverage-legend">
      <p><small><strong>Ofcom coverage levels (% of route with this level or better):</strong></small></p>
      <ul>
        <li><strong>Indoor+</strong> = Level 3-4: Good indoor coverage or better</li>
        <li><strong>Outdoor+</strong> = Level 2+: Good outdoor coverage or better</li>
        <li><strong>Variable+</strong> = Level 1+: Variable outdoor or better</li>
        <li><strong>Poor/None</strong> = Level 0: Poor to no coverage</li>
      </ul>
      <p><small><strong>Ranking:</strong> Networks ranked by average coverage level across all sampled points. Higher average = better rank. Ties receive the same rank.</small></p>
    </div>
  </div>

  <!-- Error Display (Fail Fast) -->
  <div id="error" class="error-message" style="display:none"></div>
</div>

<style>
.coverage-tool {
  max-width: 800px;
  margin: 2rem auto;
}

.intro {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--bg-card);
  color: var(--text-primary);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.button-group {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background: var(--link-color);
  color: var(--bg-card);
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
}

.btn-primary:hover {
  background: var(--link-hover);
}

.btn-primary:disabled {
  background: var(--border-color);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.progress-container {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

#progress-steps {
  margin-bottom: 1rem;
  font-family: monospace;
  font-size: 0.9rem;
}

.progress-step {
  margin: 0.5rem 0;
}

.progress-step.complete {
  color: #22c55e;
}

.progress-step.active {
  color: var(--link-color);
  font-weight: 600;
}

.progress-step.pending {
  color: var(--text-tertiary);
}

#progress-bar {
  width: 100%;
  height: 30px;
  margin-bottom: 0.5rem;
}

#progress-text {
  display: block;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.error-message {
  background: color-mix(in srgb, var(--error-color) 15%, var(--bg-card));
  border: 1px solid var(--error-color);
  color: var(--error-color);
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.coverage-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.coverage-table th,
.coverage-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.coverage-table th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.coverage-table tr:hover {
  background: var(--bg-secondary-hover);
}

.coverage-legend {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.9rem;
}

.coverage-legend p {
  margin: 0 0 0.5rem 0;
}

.coverage-legend ul {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.coverage-legend li {
  margin: 0.25rem 0;
}

#chart-container {
  margin: 2rem 0;
}

#chart-container h3 {
  margin-bottom: 1rem;
}
</style>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/proj4@2.11.0/dist/proj4.js"></script>
<script type="module" src="main.js"></script>