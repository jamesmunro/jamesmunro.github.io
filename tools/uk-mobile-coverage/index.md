---
title: UK Mobile Coverage Analyzer
hero_subtitle: Find the best network for your commute by analyzing mobile data coverage along your route
---

<div class="coverage-tool">
  <div class="intro">
    <p>Compare mobile data coverage (3G/4G/5G) from EE, Vodafone, O2, and Three along any UK route. Perfect for finding the best network for your daily commute.</p>
    <p><strong>Note:</strong> This tool focuses on data coverage only - voice coverage is not analyzed.</p>
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
      <label for="ors-api-key">OpenRouteService API Key</label>
      <input type="text" id="ors-api-key" placeholder="Get free key at openrouteservice.org" required autocomplete="off">
      <small>Free tier: 2,000 requests/day | <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noopener">Sign up here</a></small>
    </div>

    <button type="submit" class="btn-primary">Analyze Route Coverage</button>
    <small style="display:block; text-align:center; margin-top:0.5rem; color:#666;">Route sampled at 150 evenly-spaced points using Ofcom coverage data</small>
  </form>

  <!-- Step-by-Step Progress Indicator -->
  <div id="progress" class="progress-container" style="display:none">
    <div id="progress-steps"></div>
    <progress id="progress-bar" max="100" value="0"></progress>
    <span id="progress-text">Initializing...</span>
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
    <h3>Route Coverage Summary (Data Only)</h3>
    <table class="coverage-table">
      <thead>
        <tr>
          <th>Network</th>
          <th>5G Data</th>
          <th>4G Data</th>
          <th>3G+ Data</th>
          <th>Best Network?</th>
        </tr>
      </thead>
      <tbody id="summary-body">
        <!-- Populated dynamically with percentages -->
      </tbody>
    </table>
    <p><small>Voice coverage not shown - focusing on data connectivity for smartphones</small></p>
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
  background: #f5f5f5;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.btn-primary {
  background: #0066cc;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.btn-primary:hover {
  background: #0052a3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress-container {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f5f5f5;
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
  color: #28a745;
}

.progress-step.active {
  color: #0066cc;
  font-weight: 600;
}

.progress-step.pending {
  color: #999;
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
  color: #666;
}

.error-message {
  background: #ffebee;
  border: 1px solid #ef5350;
  color: #c62828;
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
  border-bottom: 1px solid #ddd;
}

.coverage-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.coverage-table tr:hover {
  background: #fafafa;
}

#chart-container {
  margin: 2rem 0;
}

#chart-container h3 {
  margin-bottom: 1rem;
}
</style>

<script src="{{ '/assets/libs/chart.js/chart.min.js' | cacheBust }}"></script>
<script src="{{ 'route-sampler.js' | cacheBust }}"></script>
<script src="{{ 'coverage-adapter.js' | cacheBust }}"></script>
<script src="{{ 'chart-renderer.js' | cacheBust }}"></script>
<script src="{{ 'coverage-analyzer.js' | cacheBust }}"></script>
