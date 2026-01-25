# UK Commute Coverage Analyser

A client-side web tool for analyzing mobile data coverage from UK networks (EE, Vodafone, O2, Three) along any route. Perfect for finding the best network for your daily commute.

## Features

- **Route Analysis**: Compare mobile coverage from EE, Vodafone, O2, and Three along any UK route.
- **Multi-Network Comparison**: Compare all 4 major UK networks simultaneously.
- **Smart Sampling**: Samples 500 evenly-spaced points along your journey for accurate coverage mapping.
- **Visual Feedback**: Step-by-step progress indicators and real-time error reporting.
- **Interactive Visualization**: Dynamic line chart showing coverage levels across the route.
- **Summary Statistics**: Table showing best networks with coverage percentages and rankings.

## How to Use

1. Enter your start and end UK postcodes.
2. Select your travel mode (Driving, Cycling, or Walking).
3. Provide your Google Maps API key (ensure Geocoding, Directions, and Maps JavaScript APIs are enabled).
4. Click **Analyse Route Coverage** to start the analysis.

## Technical Implementation

The tool uses Ofcom's tile-based coverage API, fetching pre-rendered PNG tiles and extracting coverage information directly from pixel colors.

### Workflow

1. **Geocoding**: Uses Google Geocoding API to convert postcodes to coordinates.
2. **Routing**: Uses Google Directions API to calculate the path between points.
3. **Sampling**: Samples 500 coordinates at regular intervals using the Haversine formula.
4. **Coordinate Mapping**: Converts geographic coordinates (WGS84) to British National Grid (BNG) to match Ofcom's tile system.
5. **Tile Analysis**:
   - Fetch PNG tile for each of 4 operators.
   - Extract pixel color at the precise BNG coordinate using the Canvas API.
   - Map colors to official Ofcom coverage levels (0-4) with ±10 RGB tolerance.
6. **Visualization**: Renders results using Chart.js, Google Maps, and dynamic HTML tables.

### Module Structure

```
tools/uk-commute-coverage/
├── index.md                          # Tool UI (form + styling)
├── main.mjs                          # Application entry point & UI glue
├── coverage-analyzer.mjs             # Main orchestration & Google API integration
├── google-map.mjs                    # Google Maps API integration
├── route-sampler.mjs                 # Route interpolation (haversine distance)
├── tile-coverage-adapter.mjs          # Ofcom tile API integration & caching
├── coordinate-converter.mjs           # WGS84 ↔ British National Grid conversion
├── chart-renderer.mjs                # Chart.js visualization wrapper
├── constants.mjs                     # Shared constants (API URLs, zoom levels)
├── coverage-analyzer.test.mjs        # Tests for analyzer logic (with Google mocks)
├── route-sampler.test.mjs            # Tests for sampling algorithms
├── route-visualizer.test.mjs         # Integration tests for route preview
└── README.md                         # This file
```

### Key Components

#### 1. Route Sampling (`route-sampler.mjs`)
- **Haversine distance**: Great-circle distance calculation between GPS points.
- **Linear interpolation**: Samples route at fixed intervals or fixed point count (default 500).
- **Functions**: `haversineDistance()`, `sampleRoute()`, `sampleRouteByCount()`, `getTotalDistance()`.

#### 2. Coordinate Conversion (`coordinate-converter.mjs`)
- **WGS84 ↔ BNG**: Converts latitude/longitude to British National Grid coordinates using `proj4`.
- **Tile coordinates**: Calculates which tile (x, y) at zoom 10 contains a given coordinate.
- **Pixel position**: Calculates exact pixel within a 256×256 tile.
- **Precision**: Accurate to ~5.6 meters at zoom level 10.

#### 3. Tile Coverage Adapter (`tile-coverage-adapter.mjs`)
- **Ofcom API**: Fetches PNG tiles from Ofcom's raster BNG servers.
- **Operators**: mno1=Vodafone, mno2=O2, mno3=EE, mno4=Three.
- **Caching**: Tiles cached in localStorage and IndexedDB to minimize repeat API calls.
- **Color extraction**: Uses Canvas API to read pixel colors from tiles.
- **Color matching**: Maps pixel colors to coverage levels (0-4) with configurable tolerance.

## Coverage Levels

The tool returns 5 coverage levels based on Ofcom tile colors:

| Level | Hex     | Description                    |
|-------|---------|--------------------------------|
| 4     | #7d2093 | Good outdoor and in-home       |
| 3     | #cd7be4 | Good outdoor, variable in-home |
| 2     | #0081b3 | Good outdoor                   |
| 1     | #83e5f6 | Variable outdoor               |
| 0     | #d4d4d4 | Poor to none outdoor           |

**Color tolerance**: ±10 on RGB values (configurable in `tile-coverage-adapter.mjs`)

## Development

### Setup

```bash
npm install
```

### Cloudflare Worker (CORS Proxy)

The Ofcom tile API doesn't return CORS headers, so production deployments require a proxy. A Cloudflare Worker handles this by proxying tile requests and adding the necessary headers.

**Deploying the worker:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
2. Create a new worker named `uk-commute-coverage`
3. Paste the contents of `cloudflare-worker.js`
4. Deploy

The worker proxies requests from:
```
https://uk-commute-coverage.jamesjulianmunro.workers.dev/tiles/...
```
to:
```
https://ofcom.europa.uk.com/tiles/...
```

**Local development** uses the Eleventy dev server proxy (`/api/tiles/...`) configured in `.eleventy.js`, so no Cloudflare setup is needed for local testing.

### Running Tests

```bash
npm test
```

Tests verify:
- Route sampling accuracy (haversine distance, point interpolation)
- Coordinate conversion (WGS84 → BNG → tile → pixel)
- Google API integration (via mocks for Geocoder and DirectionsService)
- Color extraction and matching (RGB/hex conversion, tolerance matching)

### Modifying the Tool

#### Changing Coverage Levels
Update the `colorMap` in the `TileCoverageAdapter` constructor in `tile-coverage-adapter.mjs`:
```javascript
this.colorMap = {
  4: '#7d2093', // Modify hex colors here
  // ...
};
```

#### Adjusting Color Tolerance
In `tile-coverage-adapter.mjs`, modify the tolerance parameter in `mapColorToCoverageLevel`:
```javascript
mapColorToCoverageLevel(hex, tolerance = COLOR_TOLERANCE)
```

#### Changing Sampling Density
In `constants.mjs`, modify the `ROUTE_SAMPLE_COUNT`:
```javascript
export const ROUTE_SAMPLE_COUNT = 500; // Change to desired count
```

## Architecture Notes

### Why Tiles Instead of Postcode API?
The original tool used a postcode-based API that required reverse-geocoding sampled points back to postcodes. The tile-based approach:
- Eliminates postcode reverse-geocoding step (fewer API calls).
- Provides continuous coverage data (not just per-postcode).
- Uses visual data (colors) directly from Ofcom's public tile server.
- Enables more granular coverage representation (5 levels vs. binary).

### Why Canvas API for Pixel Extraction?
Extracts colors directly from PNG data without external image processing library:
- Works in all browsers (no server-side processing needed).
- No dependency on Sharp or other Node.js libraries.
- Efficient memory usage (single pixel read, not full image processing).

### Coordinate System Details
Uses British National Grid (EPSG:27700) instead of Web Mercator:
- Ofcom tiles use BNG projection.
- Accurate for UK-specific distance calculations.
- Requires `proj4` for accurate transformation.
- Tile grid origin: (0, 0) at southwest; Y increases northward.

## Performance

- **Tile Caching**: PNG tiles stored in browser cache (localStorage + IndexedDB).
- **Batch Processing**: Analysis throttled to batches of 5 points to ensure browser responsiveness.
- **Typical Performance**: Analysis takes 15-45 seconds depending on route complexity and cache status.

## Limitations & Future Work

### Current Limitations
- Requires active internet connection for Google APIs and Ofcom tiles.
- Google Maps API usage is subject to your own API quota and billing.
- Ofcom tile API may not cover all UK areas equally.

### Future Improvements
- Service worker for offline tile caching.
- Export route coverage as KML/GeoJSON.
- Historical coverage tracking (if Ofcom versioning available).

## Browser Compatibility

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.
- **Required features**: 
  - Canvas API (pixel data extraction)
  - localStorage/IndexedDB (tile caching)
  - Fetch API (tile fetching)
  - ES6 JavaScript (Modules, arrow functions, etc.)