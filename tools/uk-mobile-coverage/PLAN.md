# UK Mobile Network Coverage Route Analyzer - Implementation Plan

## Overview
A fully client-side tool for visualizing mobile network coverage (EE, Vodafone, O2, Three) along a route using a 1D line chart showing signal strength vs. distance.

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

1. **Input**: User enters start/end locations (addresses or postcodes)
2. **Routing**: Fetch route from OpenRouteService API (returns GeoJSON)
3. **Sampling**: Sample points every 500m-1km along route using haversine distance
4. **Geocoding**: Convert coordinates → postcodes using Postcodes.io
5. **Coverage**: Query coverage data for each postcode (with rate limiting)
6. **Visualization**: Display 1D plot showing signal quality along route

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
- **Y-axis**: Signal strength categorical (None / 3G / 4G / 5G)
- **4 Lines**: One per network (color-coded)
- **Interactive**: Hover to see location, postcode, exact coverage

```
5G  ████████░░░░░░░░████████  ← EE (blue)
4G  ███████████░░░███████████  ← Vodafone (red)
3G  ████████████████████░░░░░  ← O2 (cyan)
None ░░░░█████████░░░░░░█████  ← Three (purple)
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
        labels: ['No Signal', '3G', '4G', '5G'],
        title: {
          display: true,
          text: 'Signal Type'
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
      <label for="start">Start Location</label>
      <input type="text" id="start" placeholder="Enter address or postcode" required>
    </div>

    <div class="form-group">
      <label for="end">End Location</label>
      <input type="text" id="end" placeholder="Enter address or postcode" required>
    </div>

    <div class="form-group">
      <label for="ors-api-key">OpenRouteService API Key</label>
      <input type="text" id="ors-api-key" placeholder="Get free key at openrouteservice.org">
      <small>Free tier: 2,000 requests/day</small>
    </div>

    <div class="form-group">
      <label for="data-source">Coverage Data Source</label>
      <select id="data-source">
        <option value="demo" selected>Demo Mode (mock data)</option>
        <option value="proxy">Custom Proxy (requires setup)</option>
        <option value="ofcom-direct">Direct Ofcom API (may not work due to CORS)</option>
      </select>
    </div>

    <div class="form-group">
      <label for="sample-interval">Sample Interval (meters)</label>
      <input type="number" id="sample-interval" value="500" min="100" max="5000" step="100">
      <small>Smaller = more accurate but slower</small>
    </div>

    <button type="submit" class="btn-primary">Analyze Route Coverage</button>
  </form>

  <!-- Progress Indicator -->
  <div id="progress" class="progress-container" style="display:none">
    <progress id="progress-bar" max="100" value="0"></progress>
    <span id="progress-text">Analyzing route...</span>
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
    <h3>Route Coverage Summary</h3>
    <table class="coverage-table">
      <thead>
        <tr>
          <th>Network</th>
          <th>5G Coverage</th>
          <th>4G Coverage</th>
          <th>3G+ Coverage</th>
          <th>Overall Score</th>
        </tr>
      </thead>
      <tbody id="summary-body">
        <!-- Populated dynamically -->
      </tbody>
    </table>
  </div>

  <!-- Error Display -->
  <div id="error" class="error-message" style="display:none"></div>
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

```json
{
  "SW1A 1AA": {
    "postcode": "SW1A 1AA",
    "networks": {
      "EE": {
        "voice": true,
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "Vodafone": {
        "voice": true,
        "data3G": true,
        "data4G": true,
        "data5G": false
      },
      "O2": {
        "voice": true,
        "data3G": true,
        "data4G": true,
        "data5G": true
      },
      "Three": {
        "voice": true,
        "data3G": true,
        "data4G": false,
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
- [ ] Implement route input form with start/end locations
- [ ] Integrate OpenRouteService for routing
- [ ] Implement route sampling algorithm (haversine, interpolation)
- [ ] Integrate Postcodes.io for coordinate-to-postcode conversion
- [ ] Create coverage data adapter with proxy/mock support
- [ ] Implement 1D chart visualization with Chart.js
- [ ] Add loading states and progress indicators
- [ ] Add error handling and user feedback
- [ ] Write unit tests for algorithms
- [ ] Create example proxy function for Ofcom API
- [ ] Test and optimize performance
- [ ] Document setup instructions (API keys, etc.)

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

- **Route sampling**: Balance accuracy vs. API calls (default 500m is reasonable)
- **Rate limiting**: Batch requests and add delays to respect API limits
- **Caching**: Cache postcode lookups (many points may share postcodes)
- **Progress feedback**: Keep user informed during long processing
- **Error recovery**: Handle API failures gracefully with retries

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
