# UK Commute Coverage Analyser

A client-side web tool for analyzing mobile data coverage from UK networks (EE, Vodafone, O2, Three) along any route. Perfect for finding the best network for your daily commute.

## Features

- **Route Analysis**: Enter any two UK postcodes and analyse coverage along the route
- **Multi-Network Comparison**: Compare all 4 major UK networks simultaneously
- **Visual Feedback**: Step-by-step progress indicators and real-time error reporting
- **Interactive Visualization**: Line chart showing coverage levels across the route
- **Summary Statistics**: Table showing best networks with coverage percentages
- **Client-Side Processing**: All computations run in your browser—no server-side data storage

## How to Use

1. Enter your start and end postcodes
2. Provide your OpenRouteService API key (free tier available)
3. Click "Analyse Route Coverage"
4. View interactive chart and summary table showing coverage by network

The tool samples 150 evenly-spaced points along your route and queries coverage data for each point.

## Technical Architecture

### Modern Tile-Based Approach (2026)

The tool uses Ofcom's tile-based coverage API, fetching pre-rendered PNG tiles and extracting coverage information directly from pixel colors:

```
User Input (postcodes + API key)
    ↓
Validate postcodes
    ↓
Postcodes.io → Convert postcodes to coordinates
    ↓
OpenRouteService → Get route between coordinates
    ↓
Sample 150 points evenly along route
    ↓
For each sample point:
    - Convert WGS84 (lat/lon) → British National Grid coordinates
    - Calculate tile coordinates (zoom level 10)
    - Fetch PNG tile for each of 4 operators
    - Extract pixel color at calculated position
    - Map color to coverage level (0-4)
    ↓
Aggregate coverage across all sampled points
    ↓
Render chart and summary table
```

### Module Structure

```
tools/uk-commute-coverage/
├── index.md                          # Tool UI (form + styling + script tags)
├── coverage-analyzer.js              # Main orchestration & workflow
├── route-sampler.js                  # Route interpolation (haversine distance)
├── tile-coverage-adapter.js          # Ofcom tile API integration
├── coordinate-converter.js           # WGS84 ↔ British National Grid conversion
├── pixel-extractor.js                # Canvas-based color extraction
├── chart-renderer.js                 # Chart.js visualization wrapper
├── coverage-analyzer.test.js         # Route sampler + analyzer tests
├── tile-api.test.js                  # Coordinate, pixel, color tests
├── GEO.md                            # Coordinate conversion technical spec
└── README.md                         # This file
```

### Key Components

#### 1. Route Sampling (`route-sampler.js`)
- **Haversine distance**: Great-circle distance calculation between GPS points
- **Linear interpolation**: Samples route at fixed intervals or fixed point count
- **Functions**: `haversineDistance()`, `sampleRoute()`, `sampleRouteByCount()`, `getTotalDistance()`
- **Export**: CommonJS (Node.js testing) + global scope (browser)

#### 2. Coordinate Conversion (`coordinate-converter.js`)
- **WGS84 ↔ BNG**: Converts latitude/longitude to British National Grid coordinates using `proj4`
- **Tile coordinates**: Calculates which tile (x, y) at zoom 10 contains a given coordinate
- **Pixel position**: Calculates exact pixel within a 256×256 tile
- **Precision**: Accurate to ~5.6 meters at zoom level 10
- **Dependencies**: `proj4` library (loads from CDN)

#### 3. Tile Coverage Adapter (`tile-coverage-adapter.js`)
- **Ofcom API**: Fetches PNG tiles from `https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2/`
- **Operators**: mno1=Vodafone, mno2=O2, mno3=EE, mno4=Three
- **Caching**: Tiles cached in localStorage and IndexedDB to minimize API calls
- **Color extraction**: Uses Canvas API to read pixel colors from tiles
- **Color matching**: Maps pixel colors to coverage levels (0-4) with ±10 RGB tolerance

#### 4. Pixel Extraction (`pixel-extractor.js`)
- **Canvas API**: Draws PNG to canvas and extracts pixel color data
- **Color conversion**: RGB ↔ hex format conversion
- **Distance calculation**: Euclidean distance between colors in RGB space
- **Tolerance matching**: Matches observed colors to standard coverage colors within tolerance

#### 5. Coverage Analyzer (`coverage-analyzer.js`)
- **Orchestration**: Coordinates entire workflow from user input to results
- **Validation**: Validates UK postcode format
- **Rate limiting**: Throttles API calls to respect rate limits
- **Error handling**: Graceful error messages for API failures
- **Progress tracking**: 5-step progress indicator with completion status

#### 6. Chart Renderer (`chart-renderer.js`)
- **Visualization**: Wraps Chart.js for tool-specific configuration
- **X-axis**: Distance along route (km)
- **Y-axis**: Coverage levels 0-4 (stepped, not interpolated)
- **Datasets**: One line per network (color-coded)
- **Summary**: Table showing best networks and coverage percentages

## Coverage Levels

The tool returns 5 coverage levels based on Ofcom tile colors:

| Level | Hex     | Description                    |
|-------|---------|--------------------------------|
| 4     | #7d2093 | Good outdoor and in-home       |
| 3     | #cd7be4 | Good outdoor, variable in-home |
| 2     | #0081b3 | Good outdoor                   |
| 1     | #83e5f6 | Variable outdoor               |
| 0     | #d4d4d4 | Poor to none outdoor           |

**Color tolerance**: ±10 on RGB values (configurable in `tile-coverage-adapter.js`)

## External Dependencies

### APIs (All CORS-enabled, free tier available)

- **Postcodes.io**: Postcode ↔ coordinates conversion
  - No authentication required
  - Free tier: Unlimited requests
  
- **OpenRouteService**: Driving route calculation
  - Requires free API key (sign up at https://openrouteservice.org)
  - Free tier: 2,000 requests/day
  
- **Ofcom Tile API**: Coverage tile data
  - No authentication required
  - Tiles cached locally to minimize requests

### Libraries

- **proj4** (v2.11.0): Coordinate system transformations
  - Loaded via CDN: `https://cdn.jsdelivr.net/npm/proj4@2.11.0/dist/proj4.js`
  - ~547k weekly downloads
  
- **Chart.js** (v4.4.0): Data visualization
  - Installed via npm
  - Self-hosted at `/assets/libs/chart.js/chart.min.js`
  - ~30M weekly downloads

## Development

### Setup

```bash
npm install
```

### Running Tests

```bash
npm test
```

Tests verify:
- Route sampling accuracy (haversine distance, point interpolation)
- Coordinate conversion (WGS84 → BNG → tile → pixel)
- Color extraction and matching (RGB/hex conversion, tolerance matching)
- Tile URL construction and cache keys
- Coverage level descriptions

**Test count**: 57 tests, all passing

### Modifying the Tool

#### Changing Coverage Levels
Update `COVERAGE_COLOR_MAP` in `tile-coverage-adapter.js`:
```javascript
const COVERAGE_COLOR_MAP = {
  4: '#7d2093', // Modify hex colors here
  3: '#cd7be4',
  // ...
};
```

#### Adjusting Color Tolerance
In `tile-coverage-adapter.js`, modify the tolerance parameter:
```javascript
const level = this.mapColorToCoverageLevel(color.hex, 10); // tolerance = 10
```

#### Changing Sampling Density
In `coverage-analyzer.js`, modify the sample count:
```javascript
const sampledPoints = sampleRouteByCount(route.coordinates, 150); // Change 150 to desired count
```

#### Updating Tile API
If Ofcom tile API structure changes:
1. Update base URL in `tile-coverage-adapter.js`
2. Update MNO mapping if operator codes change
3. Update color map if color scheme changes
4. Run tests to verify tile URL construction

#### Clearing Tile Cache
Programmatically in browser console:
```javascript
// Access the adapter instance from global scope if available
// Or call the method if exposed on window object
localStorage.removeItem('tile-cache-index');
```

## Performance

### Optimization Techniques

1. **Tile Caching**: PNG tiles stored in browser cache (localStorage + IndexedDB)
2. **Batch Processing**: Multiple tiles fetched with minimal API delays
3. **Efficient Sampling**: 150 points balances accuracy vs. API load
4. **Color Matching**: Single-pass tolerance matching for efficiency

### Typical Performance

- **Route analysis**: 30-60 seconds depending on route length
- **Tile fetch**: ~100-150ms per tile (4 operators × 150 points = ~600 requests, but cached)
- **Chart rendering**: <1 second
- **Cache hit rate**: 70-90% for common routes (London-centric)

## Limitations & Future Work

### Current Limitations
- Requires internet connection (no offline support)
- OpenRouteService free tier: 2,000 requests/day (typical routes: ~1 request each)
- Ofcom tile API may not cover all UK areas equally
- Coverage levels are approximations based on pixel colors

### Future Improvements
- Service worker for offline tile caching
- Predictive tile preloading for common routes
- Export route coverage as KML/GeoJSON
- Batch analysis of multiple routes
- Historical coverage tracking (if Ofcom versioning available)
- 3D visualization of coverage over terrain

## Architecture Notes

### Why Tiles Instead of Postcode API?
The original tool used a postcode-based API that required reverse-geocoding sampled points back to postcodes. The tile-based approach:
- Eliminates postcode reverse-geocoding step (fewer API calls)
- Provides continuous coverage data (not just per-postcode)
- Uses visual data (colors) directly from Ofcom's public tile server
- Enables more granular coverage representation (5 levels vs. binary)

### Why Canvas API for Pixel Extraction?
Extracts colors directly from PNG data without external image processing library:
- Works in all browsers (no server-side processing needed)
- No dependency on Sharp or other Node.js libraries
- Efficient memory usage (single pixel read, not full image processing)
- Browser-native API (no additional npm packages)

### Coordinate System Details
Uses British National Grid (EPSG:27700) instead of Web Mercator:
- Ofcom tiles use BNG projection (TMS convention)
- More accurate for UK-specific distance calculations
- Requires `proj4` for accurate transformation
- Tile grid origin: (0, 0) at southwest; Y increases northward

## Testing Philosophy

- **Unit tests**: Pure functions (distance calculations, color matching)
- **Integration tests**: Coordinate conversion pipeline (WGS84 → BNG → tile → pixel)
- **No DOM mocking**: Browser APIs tested manually during development
- **Focused scope**: Tests verify algorithmic correctness, not UI interactions

## Browser Compatibility

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Required features**: 
  - Canvas API (pixel data extraction)
  - localStorage/IndexedDB (tile caching)
  - Fetch API (tile fetching)
  - ES6 JavaScript (arrow functions, template literals)

## Files Reference

| File | Purpose |
|------|---------|
| `index.md` | HTML/CSS/UI for tool (form, progress, chart container, summary table) |
| `coverage-analyzer.js` | Main app controller and workflow orchestration |
| `coverage-analyzer.test.js` | Tests for route sampling and analysis |
| `route-sampler.js` | Route interpolation using haversine distance |
| `coordinate-converter.js` | WGS84 ↔ BNG conversion, tile & pixel calculations |
| `tile-coverage-adapter.js` | Ofcom tile API integration and caching |
| `pixel-extractor.js` | Canvas-based pixel color extraction |
| `chart-renderer.js` | Chart.js wrapper for visualization |
| `tile-api.test.js` | Tests for coordinate conversion, color matching, tiles |
| `GEO.md` | Technical specification for coordinate transformations |

## License

Part of [jamesmunro.github.io](https://github.com/jamesmunro/jamesmunro.github.io)
