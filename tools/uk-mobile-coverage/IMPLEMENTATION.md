# Ofcom Tile API Refactor - Implementation Summary

## Overview
Successfully refactored the UK Mobile Coverage Analyzer tool to use Ofcom's tile-based API instead of the old postcode-based API. The new implementation fetches PNG tiles and extracts coverage colors directly from pixel data.

## Files Created

### 1. **coordinate-converter.js**
- Converts between WGS84 (lat/lon) and British National Grid (BNG) coordinates
- Implements tile coordinate and pixel position calculations
- Uses `proj4` library for accurate coordinate transformations
- Functions:
  - `latLonToBng()` - Convert WGS84 to BNG
  - `bngToTile()` - Convert BNG to tile coordinates
  - `bngToPixelInTile()` - Get pixel position within tile
  - `latLonToPixelInTile()` - Direct conversion from WGS84 to pixel

### 2. **pixel-extractor.js**
- Extracts RGB colors from PNG images using Canvas API
- Provides color matching with tolerance-based matching
- Functions:
  - `extractPixelColor()` - Extract color from image at coordinates
  - `rgbToHex()` / `hexToRgb()` - Color format conversion
  - `colorDistance()` - Calculate Euclidean distance between colors
  - `mapColorToCoverageLevel()` - Match colors to coverage levels

### 3. **tile-coverage-adapter.js**
- New adapter replacing the old `coverage-adapter.js`
- Fetches tiles from Ofcom API and extracts coverage colors
- Implements localStorage and IndexedDB caching for tiles
- MNO mapping: mno1=Vodafone, mno2=O2, mno3=EE, mno4=Three
- Main method: `getCoverageFromCoordinates(lat, lon)` - Returns coverage data for any coordinate
- Returns coverage levels 0-4:
  - 0: Poor to none outdoor (gray)
  - 1: Variable outdoor (cyan)
  - 2: Good outdoor (blue)
  - 3: Good outdoor, variable in-home (light purple)
  - 4: Good outdoor and in-home (purple)

### 4. **tile-api.test.js**
- Comprehensive test suite covering:
  - Coordinate conversions (BNG → tile, BNG → pixel)
  - Pixel extraction and color operations
  - Color matching with tolerance
  - Coverage descriptions
  - Tile URL construction
  - Cache key generation
- 57 tests, all passing

## Files Modified

### 1. **coverage-analyzer.js**
- Updated to use `TileCoverageAdapter` instead of `CoverageAdapter`
- Refactored `getCoverageData()` to work directly with coordinates
- Removed postcode-to-coordinate conversion step
- Simplified workflow: samples → coverage data (no intermediate postcode lookup)
- Reduced rate limiting (now 500ms per batch instead of 1000ms)

### 2. **chart-renderer.js**
- Updated to handle new coverage level format (0-4 instead of 3G/4G/5G)
- Modified Y-axis labels: "No Coverage", "Variable", "Good Outdoor", "Mixed", "Excellent"
- Updated summary statistics to use: "Excellent", "Good", "Adequate"
- Updated tooltip descriptions for new coverage levels

### 3. **index.md**
- Added proj4 CDN script
- Updated script imports to include new modules:
  - `coordinate-converter.js`
  - `pixel-extractor.js`
  - `tile-coverage-adapter.js`
- Removed old `coverage-adapter.js` reference
- Updated table headers: "Excellent", "Good", "Adequate" instead of "5G Data", "4G Data", "3G+ Data"
- Updated summary description text

### 4. **package.json**
- Added dependencies:
  - `proj4@^2.11.0` - For coordinate transformations
  - `color@^4.2.3` - For color utilities (optional, can be used in future)

## Architecture Changes

### Old Workflow
```
Postcode → Coordinates → Route → Sample Points → 
Get Postcode for Each Point → Coverage API (per postcode)
```

### New Workflow
```
Postcode → Coordinates → Route → Sample Points → 
Get Tile Coverage (direct from coordinates)
```

### Key Benefits
1. **Faster**: Direct coordinate-to-tile conversion (no postcode API calls)
2. **More Accurate**: Uses actual Ofcom tile data with color-based level detection
3. **Better Caching**: PNG tiles cached in localStorage/IndexedDB
4. **5 Coverage Levels**: More granular than 3G/4G/5G distinction

## Tile API Specifications

**Base URL**: `https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2/10/{x}/{y}.png?v=42`

**Zoom Level**: Always 10
**Tile Size**: 256x256 pixels
**Projection**: British National Grid (EPSG:27700)
**Version**: 42

**MNO Parameters**:
- mno1 → Vodafone
- mno2 → O2
- mno3 → EE
- mno4 → Three

## Color Mappings

| Level | Hex     | RGB             | Description                      |
|-------|---------|-----------------|----------------------------------|
| 4     | #7d2093 | (125, 32, 147)  | Good outdoor and in-home         |
| 3     | #cd7be4 | (205, 123, 228) | Good outdoor, variable in-home   |
| 2     | #0081b3 | (0, 129, 179)   | Good outdoor                     |
| 1     | #83e5f6 | (131, 229, 246) | Variable outdoor                 |
| 0     | #d4d4d4 | (212, 212, 212) | Poor to none outdoor             |

**Color Tolerance**: ±10 RGB units (configurable)

## Testing

All 57 tests passing:
- Coordinate converter tests (4)
- Pixel extractor tests (6)
- Color mapping tests (4)
- Coverage descriptions tests (2)
- Tile URL construction tests (3)
- Cache key construction tests (2)
- Plus existing route sampler and pyodide tests (36)

Run tests with: `npm test`

## Browser Compatibility

- **Required**: Modern browser with Canvas API support
- **CDN Dependencies**:
  - proj4.js v2.11.0 (via CDN)
  - Chart.js (already in use)
  - ES6 support

## Future Improvements

1. **IndexedDB Optimization**: Currently tiles are stored in both memory and IndexedDB
2. **Service Worker Caching**: Could add service worker for offline tile access
3. **Tile Preloading**: Could preload tiles for common routes
4. **Performance**: Batch tile fetches for multiple points simultaneously
5. **Error Recovery**: Better error handling for failed tile downloads

## Dependencies

- **proj4**: ~547k weekly downloads - Essential for coordinate transformations
- **color**: ~32.5M weekly downloads - Optional, currently using built-in hex/RGB functions
- **Canvas API**: Browser-native, no installation needed

## Notes

- Old `coverage-adapter.js` can be removed in next cleanup
- All old postcode-based API code has been replaced
- The tool no longer requires postcode reverse geocoding
- Ofcom tile API requires no authentication
