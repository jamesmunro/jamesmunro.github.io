
## Overview

Change the tool to use data from Ofcom tile API instead of the old Ofcom API. Fetch tile PNGs and extract coverage colors from pixel data for each sampled postcode along the route.

## Tile API Details

- Base URL: https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2/
- Example: https://ofcom.europa.uk.com/tiles/gbof_mno1_raster_bng2/10/713/302.png?v=42
- Zoom level: Always use **zoom 10**
- For coordinate-to-tile-to-pixel conversion: See GEO.md

## Mobile Network Operator Mapping

| MNO Parameter | Network | ID |
|---------------|---------|-----|
| mno1 | Vodafone | vodafone |
| mno2 | O2 | o2 |
| mno3 | EE | ee |
| mno4 | Three | three |

Query all 4 operators for each postcode.

## Implementation Details

### Architecture

- Remove all references to the old Ofcom API
- Don't use the `CoverageAdapter` that queries the old API
- New adapter should fetch tile PNGs and extract color data

### Workflow

1. For each postcode sampled on the route:
   - Convert postcode (lat/lon) → BNG coordinates (via GEO.md formulas)
   - Convert BNG → tile coordinates (x, y) at zoom 10
   - Convert BNG → pixel position within tile
   - Fetch PNG tile for each of the 4 operators
   - Extract color from the pixel position
   - Map color to coverage level

2. Aggregate coverage data across all sampled points
3. Present results by individual operator

### Color Mapping

Coverage levels are color-coded as follows (best signal first):

| Hex Color | Level | Description |
|-----------|-------|-------------|
| #7d2093 | 4 | Good outdoor and in-home |
| #cd7be4 | 3 | Good outdoor, variable in-home |
| #0081b3 | 2 | Good outdoor |
| #83e5f6 | 1 | Variable outdoor |
| #d4d4d4 | 0 | Poor to none outdoor |

Use a tolerance of ±10 on RGB values since colors may not match exactly.

### Pixel Extraction

- Extract single pixel color at the calculated position within the tile
- Handle edge cases (pixels outside tile bounds)
- Test color extraction thoroughly

### API Call Minimization

- Cache all fetched tiles in localStorage
- Reuse cached tiles across different route analyses
- Include version parameter in cache key (currently v=42)

### Testing

Write tests to verify:
- Correct color extraction from PNG pixels
- Accurate postcode → BNG conversion
- Accurate BNG → tile coordinate conversion
- Accurate BNG → pixel position calculation
- Color matching with tolerance

### Results Presentation

Display coverage by individual operator (current 4-network comparison format).

## Dependencies

### NPM Packages to Use

#### **proj4** (~547k weekly downloads)
- **Purpose**: Coordinate system transformation (WGS84 ↔ British National Grid EPSG:27700)
- **Status**: ✅ ESSENTIAL
- **Why**: GEO.md documents using proj4js for lat/lon → BNG conversion
- **Installation**: `npm install proj4`
- **Browser**: Available via CDN or npm (works in browser)
- **Usage**: Convert postcode lat/lon to BNG easting/northing

#### **color** (~32.5M weekly downloads)
- **Purpose**: Color parsing and RGB distance calculations
- **Status**: ✅ USEFUL
- **Why**: Simplifies color matching logic with tolerance ranges
- **Installation**: `npm install color`
- **Usage**: Parse pixel hex colors, calculate distance from coverage color keys

#### Canvas API (Browser Native)
- **Purpose**: Extract pixel data from PNG images
- **Status**: ✅ ESSENTIAL (browser-native, no dependency)
- **Why**: Sharp (Node.js image library) is not browser-compatible
- **Usage**: Draw fetched PNG to canvas, extract pixel color at calculated position using `getImageData()`

## No Dependencies Needed For

- Tile fetching (use native `fetch()`)
- PNG rendering (use Canvas API)
- localStorage caching (browser native)
- Route sampling (already implemented in `route-sampler.js`)

