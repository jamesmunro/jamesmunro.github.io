# Ofcom Coverage Tile System - Technical Specification

## Overview

The Ofcom mobile coverage checker at `https://ofcom.europa.uk.com/apps/gbof/` uses a tile-based map system to display coverage data. Tiles are pre-rendered PNG images served from a tile server.

## Tile URL Format

```
https://ofcom.europa.uk.com/tiles/gbof_{mno}_raster_bng2/{z}/{x}/{y}.png?v={version}
```

### Parameters

| Parameter | Description | Values |
|-----------|-------------|--------|
| `mno` | Mobile Network Operator | `mno1`, `mno2`, `mno3`, `mno4` |
| `z` | Zoom level | 0-11 |
| `x` | Tile column index | Integer |
| `y` | Tile row index (TMS convention) | Integer |
| `version` | Cache-busting parameter | Currently `42` |

### Example

```
https://ofcom.europa.uk.com/tiles/gbof_mno1_raster_bng2/10/713/302.png?v=42
```

## Coordinate System

### Projection: British National Grid (EPSG:27700)

The tiles use the British National Grid (BNG) projection, **not** Web Mercator (EPSG:3857). This is a Transverse Mercator projection specific to Great Britain.

BNG coordinates are expressed as:
- **Easting (E)**: meters east from a false origin west of the Isles of Scilly
- **Northing (N)**: meters north from a false origin south of the Isles of Scilly

Valid ranges for Great Britain:
- Easting: ~0 to ~700,000
- Northing: ~0 to ~1,300,000

### Resolution Array (meters per pixel)

Each zoom level has a fixed resolution (verified against ground distance measurements):

| Zoom | Resolution (m/px) | Tile Coverage (m) |
|------|-------------------|-------------------|
| 0 | 2867.2 | 734,003 |
| 1 | 1433.6 | 367,002 |
| 2 | 716.8 | 183,501 |
| 3 | 358.4 | 91,750 |
| 4 | 179.2 | 45,875 |
| 5 | 89.6 | 22,938 |
| 6 | 44.8 | 11,469 |
| 7 | 22.4 | 5,734 |
| 8 | 11.2 | 2,867 |
| 9 | 5.6 | 1,434 |
| 10 | 2.8 | 717 |
| 11 | 1.4 | 358 |

Tile coverage = resolution × 256 (tile size in pixels)

### TMS Y-Axis Convention

The tile server uses **TMS (Tile Map Service)** convention where:
- Y = 0 is at the **bottom** (south)
- Y increases northward

This is the opposite of the "XYZ" / "Slippy Map" convention used by Google Maps and OpenStreetMap.

## Converting Coordinates to Tile Indices

### From British National Grid (Easting/Northing) to Tile (x, y, z)

```javascript
const resolutions = [2867.2, 1433.6, 716.8, 358.4, 179.2, 89.6, 44.8, 22.4, 11.2, 5.6, 2.8, 1.4];
const TILE_SIZE = 256;

// BNG origin for the tile grid (standard OSGB origin)
const ORIGIN_X = 0;         // Easting origin
const ORIGIN_Y = 0;         // Northing origin

function bngToTile(easting, northing, zoom) {
    const resolution = resolutions[zoom];
    const tileSpan = resolution * TILE_SIZE;

    const x = Math.floor((easting - ORIGIN_X) / tileSpan);
    const y = Math.floor((northing - ORIGIN_Y) / tileSpan);  // TMS: y increases northward

    return { x, y, z: zoom };
}
```

### From WGS84 (Lat/Lon) to British National Grid

To convert from latitude/longitude (WGS84, EPSG:4326) to BNG, use the Ordnance Survey transformation. This involves:

1. Convert lat/lon to 3D Cartesian coordinates
2. Apply a Helmert transformation (7-parameter)
3. Project to Transverse Mercator

Libraries that handle this:
- **JavaScript**: [proj4js](https://github.com/proj4js/proj4js) with EPSG:27700 definition
- **Python**: `pyproj` or `osgeo.osr`

```javascript
// Using proj4js
import proj4 from 'proj4';

// Define BNG projection
proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs');

function latLonToBng(lat, lon) {
    const [easting, northing] = proj4('EPSG:4326', 'EPSG:27700', [lon, lat]);
    return { easting, northing };
}
```

### Complete Conversion: Lat/Lon to Tile

```javascript
function latLonToTile(lat, lon, zoom) {
    const { easting, northing } = latLonToBng(lat, lon);
    return bngToTile(easting, northing, zoom);
}

// Example: London (51.5074, -0.1278)
const tile = latLonToTile(51.5074, -0.1278, 10);
// Returns: { x: 739, y: 251, z: 10 }
```

## Pixel Position Within a Tile

To find the exact pixel within a tile for a given coordinate:

```javascript
function bngToPixelInTile(easting, northing, zoom) {
    const resolution = resolutions[zoom];
    const tileSpan = resolution * TILE_SIZE;

    const x = Math.floor((easting - ORIGIN_X) / tileSpan);
    const y = Math.floor((northing - ORIGIN_Y) / tileSpan);

    // Pixel offset within the tile
    const pixelX = Math.floor(((easting - ORIGIN_X) % tileSpan) / resolution);
    const pixelY = TILE_SIZE - 1 - Math.floor(((northing - ORIGIN_Y) % tileSpan) / resolution);
    // Note: pixelY is inverted because PNG pixel 0 is at top, but BNG northing increases upward

    return { tileX: x, tileY: y, pixelX, pixelY };
}
```

## Coverage Data Interpretation

The PNG tiles contain colour-coded coverage information. Pixel colours indicate:
- **Presence of colour**: Coverage available
- **Transparency**: No coverage data / out of bounds

Exact colour meanings depend on the coverage type being displayed (voice, data, 4G, 5G, etc.).

## Leaflet Configuration Reference

The original implementation uses these Leaflet options:

```javascript
L.tileLayer(tileURL, {
    tms: true,        // TMS y-axis convention
    noWrap: true,     // Don't wrap around the world
    opacity: 0.8
});
```
