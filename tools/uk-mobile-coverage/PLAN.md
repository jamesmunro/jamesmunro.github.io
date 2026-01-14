# UK Mobile Network Coverage Route Analyzer - Implementation Plan

## Overview
A fully client-side tool for visualizing mobile network **data coverage** (EE, Vodafone, O2, Three) along a route using a 1D line chart showing data signal strength vs. distance.

**Primary use case**: Finding the best network for daily commutes.

**Key design decisions**:
- ✅ **Data coverage only** (3G/4G/5G data) - voice coverage ignored
- ✅ **Postcode-only input** - simple UK-specific approach
- ✅ **Fixed 500m sampling** - no user configuration needed
- ✅ **Fail fast** - clear error messages, no silent failures
- ✅ **Step-by-step progress** - detailed status updates during analysis

## Research Findings

### ✅ CORS-Enabled APIs (Client-Side Ready)
- **Postcodes.io** - Free, CORS-enabled, no auth required
  - https://postcodes.io/
  - Reverse geocoding: lat/lng → postcode

- **OpenRouteService** - Free tier, CORS-enabled, requires API key
  - https://openrouteservice.org/
  - Routing API returns GeoJSON with route coordinates

### ⚠️ CORS Challenge: Ofcom API
- **Ofcom API** - Uses Azure API Management, CORS support uncertain
  - https://api.ofcom.org.uk/
  - Most examples show server-side usage
  - **Solution**: Provide multiple data source options (direct/proxy/demo)

## Project Structure

```
tools/uk-mobile-coverage/
├── index.md                    # Tool page with form inputs and description
├── coverage-analyzer.js        # Main application logic
├── route-sampler.js           # Route sampling algorithms (haversine, interpolation)
├── coverage-adapter.js        # Data source adapter (Ofcom/mock/proxy)
├── chart-renderer.js          # 1D visualization with Chart.js
├── coverage-analyzer.test.js  # Unit tests
├── proxy-example.js           # Example Cloudflare Worker proxy code
├── demo-data.json             # Mock coverage data for demo/testing
└── PLAN.md                    # This file
```

## User Flow

1. **Input**: User enters start/end postcodes (e.g., "SW1A 1AA" → "EC2N 2DB")
2. **Validation**: Validate postcode format, convert to coordinates via Postcodes.io
3. **Routing**: Fetch route from OpenRouteService API (returns GeoJSON)
4. **Sampling**: Sample points every 500m (fixed) along route using haversine distance
5. **Geocoding**: Convert sampled coordinates → postcodes using Postcodes.io
6. **Coverage**: Query **data coverage** (3G/4G/5G) for each postcode (with rate limiting)
7. **Visualization**: Display 1D plot showing data signal quality along route

**Progress feedback at each step**:
- ✓ Validating postcodes... Done
- ✓ Converting postcodes to coordinates... Done
- ✓ Fetching route from OpenRouteService... Done
- ✓ Sampling 47 points along route... Done
- ⏳ Getting coverage data... 23/47 postcodes

**Error handling**: Fail fast with specific errors:
- "Invalid postcode format: SW1A1AA (missing space)"
- "Postcode not found: XY99 9ZZ"
- "OpenRouteService API key required"
- "Route not found between these postcodes"
- "Coverage data unavailable for postcode NE1 4ST"

## Coverage Data Strategy

```javascript
// Flexible adapter pattern to support multiple data sources
const coverageAdapter = {
  async getCoverage(postcode) {
    switch(config.dataSource) {
      case 'proxy':
        // User-deployed proxy server with CORS headers
        return await fetchFromProxy(postcode);
      case 'demo':
        // Local mock data for testing
        return getDemoData(postcode);
      case 'ofcom-direct':
        // Direct Ofcom API (may fail due to CORS)
        return await fetchOfcomDirect(postcode);
    }
  }
};
```

## Visualization Design

**1D Line Chart** using Chart.js:
- **X-axis**: Distance along route (km)
- **Y-axis**: **Data coverage** categorical (No Data / 3G Data / 4G Data / 5G Data)
- **4 Lines**: One per network (color-coded)
- **Interactive**: Hover to see location, postcode, exact coverage
- **Note**: Voice coverage is **ignored** - focus is on data connectivity for smartphones

```
5G Data  ████████░░░░░░░░████████  ← EE (#00a0dc - blue)
4G Data  ███████████░░░███████████  ← Vodafone (#e60000 - red)
3G Data  ████████████████████░░░░░  ← O2 (#0019a5 - dark blue)
No Data  ░░░░█████████░░░░░░█████  ← Three (#8a00b8 - purple)
         |-------|-------|-------|
         0km    10km    20km    30km
```

## Key Technical Components

### 1. Route Sampling Algorithm

```javascript
// Haversine distance + linear interpolation
function sampleRoute(coordinates, intervalMeters = 500) {
  const points = [];
  let distanceAlongRoute = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [p1, p2] = [coordinates[i], coordinates[i + 1]];
    const segmentDist = haversineDistance(p1, p2);
    const numSamples = Math.ceil(segmentDist / intervalMeters);

    for (let j = 0; j < numSamples; j++) {
      const fraction = j / numSamples;
      points.push({
        lat: p1[1] + (p2[1] - p1[1]) * fraction,
        lng: p1[0] + (p2[0] - p1[0]) * fraction,
        distance: distanceAlongRoute + segmentDist * fraction
      });
    }
    distanceAlongRoute += segmentDist;
  }
  return points;
}

function haversineDistance(point1, point2) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

### 2. Batch Processing with Rate Limiting

```javascript
async function processPoints(points) {
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;
  const results = [];

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(p => getCoverageForPoint(p))
    );
    results.push(...batchResults);

    // Progress update
    updateProgress((i / points.length) * 100);

    // Rate limiting
    if (i + BATCH_SIZE < points.length) {
      await sleep(DELAY_MS);
    }
  }
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3. Chart Configuration

```javascript
const chartConfig = {
  type: 'line',
  data: {
    datasets: [
      {
        label: 'EE',
        data: eeDataPoints, // [{x: distance, y: signalStrength}]
        borderColor: '#00a0dc',
        backgroundColor: 'rgba(0, 160, 220, 0.1)',
        tension: 0.1,
        stepped: true // Makes signal changes look clearer
      },
      {
        label: 'Vodafone',
        data: vodafoneDataPoints,
        borderColor: '#e60000',
        backgroundColor: 'rgba(230, 0, 0, 0.1)',
        tension: 0.1,
        stepped: true
      },
      {
        label: 'O2',
        data: o2DataPoints,
        borderColor: '#0019a5',
        backgroundColor: 'rgba(0, 25, 165, 0.1)',
        tension: 0.1,
        stepped: true
      },
      {
        label: 'Three',
        data: threeDataPoints,
        borderColor: '#8a00b8',
        backgroundColor: 'rgba(138, 0, 184, 0.1)',
        tension: 0.1,
        stepped: true
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Distance (km)'
        },
        ticks: {
          callback: function(value) {
            return (value / 1000).toFixed(1); // Convert meters to km
          }
        }
      },
      y: {
        type: 'category',
        labels: ['No Data', '3G Data', '4G Data', '5G Data'],
        title: {
          display: true,
          text: 'Data Coverage Type'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            // Show postcode and exact location in tooltip
            const point = context.raw;
            return `Postcode: ${point.postcode}\nLat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`;
          }
        }
      },
      legend: {
        display: true,
        position: 'top'
      }
    }
  }
};
```

## UI Components

### HTML Structure

```html
<!-- Input Form -->
<div class="coverage-tool">
  <form id="route-form">
    <div class="form-group">
      <label for="start">Start Postcode</label>
      <input type="text" id="start" placeholder="e.g., SW1A 1AA" required pattern="[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}">
      <small>UK postcode format (e.g., SW1A 1AA)</small>
    </div>

    <div class="form-group">
      <label for="end">End Postcode</label>
      <input type="text" id="end" placeholder="e.g., EC2N 2DB" required pattern="[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}">
      <small>UK postcode format (e.g., EC2N 2DB)</small>
    </div>

    <div class="form-group">
      <label for="ors-api-key">OpenRouteService API Key</label>
      <input type="text" id="ors-api-key" placeholder="Get free key at openrouteservice.org" required>
      <small>Free tier: 2,000 requests/day | <a href="https://openrouteservice.org/dev/#/signup" target="_blank">Sign up</a></small>
    </div>

    <div class="form-group">
      <label for="data-source">Coverage Data Source</label>
      <select id="data-source">
        <option value="demo" selected>Demo Mode (mock data)</option>
        <option value="proxy">Custom Proxy (requires setup)</option>
        <option value="ofcom-direct">Direct Ofcom API (may not work due to CORS)</option>
      </select>
      <small>Sample interval: 500m (fixed)</small>
    </div>

    <button type="submit" class="btn-primary">Analyze Route Coverage</button>
  </form>

  <!-- Step-by-Step Progress Indicator -->
  <div id="progress" class="progress-container" style="display:none">
    <div id="progress-steps">
      <!-- Dynamically populated with steps -->
    </div>
    <progress id="progress-bar" max="100" value="0"></progress>
    <span id="progress-text">Initializing...</span>
  </div>

  <!-- Chart Canvas -->
  <div id="chart-container" style="display:none">
    <h3>Coverage Along Route</h3>
    <div style="height: 400px;">
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
  <div id="error" class="error-message" style="display:none">
    <!-- Shows specific error messages like:
         "Invalid postcode format: SW1A1AA (missing space)"
         "Route not found between these postcodes"
         etc. -->
  </div>
</div>
```

## External Dependencies

### Chart.js
Add to `package.json`:
```json
{
  "dependencies": {
    "chart.js": "^4.4.0"
  }
}
```

Add passthrough copy in `.eleventy.js`:
```javascript
eleventyConfig.addPassthroughCopy({
  "node_modules/chart.js/dist/chart.min.js": "assets/libs/chart.js/chart.min.js"
});
```

Include in `index.md`:
```html
<script src="/assets/libs/chart.js/chart.min.js"></script>
```

## Example Proxy (Optional for Real Data)

Users who want real Ofcom data can deploy this Cloudflare Workers proxy:

```javascript
// proxy-example.js - Deploy to Cloudflare Workers
// Instructions: https://developers.cloudflare.com/workers/

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const url = new URL(request.url);
    const postcode = url.searchParams.get('postcode');

    if (!postcode) {
      return new Response('Missing postcode parameter', { status: 400 });
    }

    // Fetch from Ofcom API
    const ofcomUrl = `https://api.ofcom.org.uk/mobile-coverage/v1/coverage?postcode=${encodeURIComponent(postcode)}`;

    try {
      const response = await fetch(ofcomUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': 'YOUR_OFCOM_API_KEY_HERE'
        }
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
```

## Demo Data Structure

**Data coverage only** - voice fields removed for simplicity:

```json
{
  "SW1A 1AA": {
    "postcode": "SW1A 1AA",
    "networks": {
      "EE": {
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "Vodafone": {
        "data3G": true,
        "data4G": true,
        "data5G": false
      },
      "O2": {
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "Three": {
        "data3G": true,
        "data4G": false,
        "data5G": false
      }
    }
  },
  "EC2N 2DB": {
    "postcode": "EC2N 2DB",
    "networks": {
      "EE": {
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "Vodafone": {
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "O2": {
        "data3G": true,
        "data4G": true,
        "data5G": false
      },
      "Three": {
        "data3G": true,
        "data4G": true,
        "data5G": false
      }
    }
  }
}
```

## Expected Output

The tool will generate:
1. **Interactive line chart** showing all 4 networks simultaneously
2. **Clear visualization** of coverage gaps and transitions
3. **Summary table** with percentage statistics per network
4. **Hover tooltips** showing exact location and postcode
5. **Ability to export** data (future enhancement)

## Implementation Tasks

- [ ] Create tool directory structure
- [ ] Implement postcode-only input form with validation
- [ ] Integrate Postcodes.io for postcode → coordinate conversion
- [ ] Integrate OpenRouteService for routing
- [ ] Implement route sampling algorithm (fixed 500m, haversine, interpolation)
- [ ] Integrate Postcodes.io for coordinate → postcode conversion (reverse geocoding)
- [ ] Create coverage data adapter with proxy/mock/direct support (data coverage only)
- [ ] Create demo data for testing (data coverage only, no voice)
- [ ] Implement 1D chart visualization with Chart.js (data coverage Y-axis)
- [ ] Add step-by-step progress indicators with detailed status
- [ ] Add fail-fast error handling with clear, specific messages
- [ ] Write unit tests for core algorithms (haversine, sampling)
- [ ] Create example Cloudflare Workers proxy for Ofcom API
- [ ] Test end-to-end and optimize performance
- [ ] Document setup instructions (API keys, postcode format, etc.)

## API Keys Required

### For Users
1. **OpenRouteService API Key** (required)
   - Free tier: 2,000 requests/day
   - Sign up: https://openrouteservice.org/dev/#/signup

2. **Ofcom API Key** (optional, only if using direct/proxy mode)
   - Sign up: https://api.ofcom.org.uk/

### No Keys Needed
- Postcodes.io - completely free, no auth
- Demo mode - uses local mock data

## Performance Considerations

- **Route sampling**: Fixed 500m interval - good balance for typical UK commutes (10-30km)
- **Rate limiting**: Batch requests and add delays to respect API limits
- **Caching**: Cache postcode lookups (many points may share same postcode)
- **Progress feedback**: Detailed step-by-step updates (validating → routing → sampling → coverage)
- **Error handling**: Fail fast with specific error messages - no silent failures or partial results
- **Input validation**: Validate postcode format before making any API calls
- **Data focus**: Query data coverage only (3G/4G/5G) - ignore voice for simplicity

## Future Enhancements

- [ ] Add map visualization showing route with coverage overlay
- [ ] Export results as CSV/JSON
- [ ] Compare multiple routes side-by-side
- [ ] Save/load routes for later analysis
- [ ] Add indoor vs. outdoor coverage option
- [ ] Support for walking/cycling routes (not just driving)
- [ ] Historical coverage data comparison

## References

### APIs
- Ofcom API: https://api.ofcom.org.uk/
- Postcodes.io: https://postcodes.io/
- OpenRouteService: https://openrouteservice.org/

### Documentation
- Azure API Management CORS: https://learn.microsoft.com/en-us/azure/api-management/cors-policy
- OpenRouteService JavaScript Client: https://github.com/GIScience/openrouteservice-js
- Chart.js Documentation: https://www.chartjs.org/docs/

### Related Tools
- Ofcom Map Your Mobile: https://www.ofcom.org.uk/mobile-coverage-checker
- UK Mobile Coverage: https://ukmobilecoverage.co.uk/
