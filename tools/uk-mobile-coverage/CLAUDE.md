# UK Mobile Coverage Route Analyzer - Claude Context

## Tool Overview
A fully client-side web tool for analyzing mobile data coverage (3G/4G/5G) from UK networks (EE, Vodafone, O2, Three) along a route. Primary use case: finding the best network for daily commutes.

**Key Features:**
- Postcode-to-postcode route analysis
- Fixed 500m sampling intervals along routes
- 1D line chart visualization showing coverage vs. distance
- Data coverage only (voice coverage ignored)
- Step-by-step progress feedback
- Fail-fast error handling

## Architecture

### Module Structure
```
tools/uk-mobile-coverage/
├── index.md                     # Tool UI page (form + embedded styles/scripts)
├── coverage-analyzer.js         # Main orchestration & workflow
├── route-sampler.js            # Geographic calculations (haversine, interpolation)
├── coverage-adapter.js         # Data source abstraction layer
├── chart-renderer.js           # Chart.js visualization wrapper
├── coverage-analyzer.test.js   # Unit tests (30 tests)
├── demo-data.json              # Mock coverage data for demo mode
├── proxy-example.js            # Optional Cloudflare Workers proxy template
└── CLAUDE.md                   # This file
```

### Data Flow
```
User Input (postcodes + API key)
    ↓
Validate Postcodes
    ↓
Postcodes.io API → Convert to coordinates
    ↓
OpenRouteService API → Get route GeoJSON
    ↓
Route Sampling → Sample points every 500m (haversine distance)
    ↓
Postcodes.io API → Reverse geocode sampled points
    ↓
Coverage Adapter → Get coverage data (demo/proxy/direct)
    ↓
Chart Renderer → Display 1D visualization + summary table
```

## Key Technical Components

### 1. Route Sampling Algorithm (route-sampler.js)
- **Haversine distance**: Accurate great-circle distance between GPS coordinates
- **Linear interpolation**: Sample points along route segments at fixed intervals
- **Always includes**: First point + sampled points along route
- **Exported functions**: `haversineDistance()`, `sampleRoute()`, `getTotalDistance()`

### 2. Coverage Adapter Pattern (coverage-adapter.js)
Flexible data source abstraction supporting:
- **Demo mode**: Uses local `demo-data.json` (no API calls)
- **Proxy mode**: User-deployed CORS proxy to Ofcom API
- **Direct mode**: Direct Ofcom API calls (may fail due to CORS)

Includes rate limiting and batch processing to respect API limits.

### 3. Chart Renderer (chart-renderer.js)
- Wraps Chart.js with tool-specific configuration
- **X-axis**: Distance along route (km)
- **Y-axis**: Categorical coverage levels (No Data / 3G / 4G / 5G)
- **4 datasets**: One line per network (color-coded)
- **Stepped lines**: Clearer visualization of coverage transitions
- **Interactive tooltips**: Shows postcode, coordinates, coverage at point

### 4. Main Analyzer (coverage-analyzer.js)
Orchestrates the entire workflow:
- Form handling and input validation
- Step-by-step progress tracking (5 steps)
- Error handling and user feedback
- API integration (Postcodes.io, OpenRouteService)
- Results rendering (chart + summary table)

## External Dependencies

### APIs (All CORS-enabled)
- **Postcodes.io**: Free, no auth, postcode ↔ coordinates conversion
  - Forward: `/postcodes/{postcode}` → lat/lng
  - Reverse: `/postcodes?lon={lng}&lat={lat}` → postcode
- **OpenRouteService**: Free tier (2,000 req/day), requires API key
  - Directions API: Returns GeoJSON route between coordinates
- **Ofcom API**: Optional, for real coverage data (CORS may require proxy)

### Libraries
- **Chart.js** (v4.4.0): Visualization
  - Installed via npm: `npm install chart.js`
  - Self-hosted at `/assets/libs/chart.js/chart.min.js`
  - Configured in `.eleventy.js` passthrough copy

## Testing

### Running Tests
```bash
npm test  # Runs all *.test.js files including coverage-analyzer.test.js
```

### Test Coverage
- 30 unit tests covering:
  - Haversine distance calculations (accuracy, edge cases)
  - Route sampling (intervals, total distance, point distribution)
  - Error handling (invalid routes, missing coordinates)

### Test Philosophy
- Unit tests for pure functions (geographic calculations)
- No mocking of browser APIs (DOM manipulation tested manually)
- Focus on algorithmic correctness (distance, sampling accuracy)

## Common Development Tasks

### Adding New Coverage Data Sources
1. Add new option to `coverage-adapter.js` → `getCoverage()` method
2. Update dropdown in `index.md` → `<select id="data-source">`
3. Add corresponding documentation in help text

### Modifying Sampling Interval
Currently fixed at 500m. To make configurable:
1. Add input field in `index.md`
2. Pass interval to `sampleRoute()` in `coverage-analyzer.js:90`
3. Update validation (reasonable range: 100m - 2000m)

### Changing Visualization Style
All chart configuration in `chart-renderer.js`:
- Colors: `datasets[].borderColor`
- Line style: `tension` (smoothness), `stepped` (discrete changes)
- Axes: `options.scales.x/y`

### Adding New Networks
1. Update `demo-data.json` with new network data
2. Add dataset in `chart-renderer.js:createChart()`
3. Update summary table generation in `coverage-analyzer.js`

## Key Algorithms Explained

### Haversine Formula
Calculates great-circle distance between two lat/lng points:
```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c  (R = 6371000m Earth radius)
```
Why: Accurate for short distances (UK routes), avoids flat-earth approximations.

### Route Sampling
For each segment between route waypoints:
1. Calculate segment distance using haversine
2. Determine number of samples: `ceil(segmentDist / interval)`
3. Linearly interpolate lat/lng along segment
4. Track cumulative distance for each point

Why fixed 500m: Balance between accuracy and API call volume (typical 10-30km commute = 20-60 points).

## Design Decisions

### Why Data Coverage Only?
- Modern use case: smartphone data connectivity during commutes
- Voice coverage less relevant (VoIP over data, messaging apps)
- Simplifies API responses and visualization

### Why Postcode-Only Input?
- UK-specific tool, postcodes are intuitive for UK users
- Postcodes.io provides reliable free API
- Avoids need for geocoding UI or map picking

### Why Client-Side Only?
- No server costs or maintenance
- Instant deployment via static hosting
- User API keys = no shared rate limits
- Privacy: no route data sent to our servers

## Error Handling Philosophy

**Fail Fast**: Show specific errors immediately, don't continue with partial data.

Examples:
- "Invalid postcode format: SW1A1AA (missing space)"
- "Postcode not found: XY99 9ZZ"
- "Route not found between these postcodes"
- "OpenRouteService API error: Invalid API key"

All errors shown in dedicated `#error` div with red background.

## Project Context

This tool is part of the jamesmunro.github.io static site. For general project conventions:
- See `/CLAUDE.md` in project root
- Uses Eleventy (11ty) with Nunjucks templates
- Follows "tools as subdirectories" pattern
- ES6+ browser-compatible JavaScript (no build step for tool logic)

## Future Enhancement Ideas
- Map visualization overlay (requires mapping library)
- CSV/JSON export of results
- Save/load routes (localStorage)
- Indoor vs outdoor coverage toggle
- Multi-route comparison
- Historical coverage data
