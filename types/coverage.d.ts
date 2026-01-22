/**
 * Coverage-related type definitions for uk-commute-coverage tools
 */

/** Coverage level from Ofcom tiles (0-4) */
export type CoverageLevel = 0 | 1 | 2 | 3 | 4 | null;

/** WGS84 coordinates (lat/lon) */
export interface LatLng {
  lat: number;
  lng: number;
}

/** British National Grid coordinates */
export interface BngCoordinate {
  easting: number;
  northing: number;
}

/** Tile coordinates with zoom level */
export interface TileCoordinate {
  tileX: number;
  tileY: number;
  z: number;
}

/** Pixel position within a tile */
export interface PixelInTile extends TileCoordinate {
  pixelX: number;
  pixelY: number;
}

/** BNG bounding box */
export interface BngBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** WGS84 bounding box */
export interface Wgs84Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** RGB color values */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** RGB color with alpha and hex representation */
export interface ExtractedColor extends RgbColor {
  a: number;
  hex: string;
}

/** Network coverage result for a single operator */
export interface NetworkCoverageResult {
  level: CoverageLevel;
  color?: string;
  description?: string;
  error?: string;
}

/** Coverage data for all networks at a location */
export interface CoverageData {
  latitude: number;
  longitude: number;
  networks: Record<string, NetworkCoverageResult>;
  error?: string;
}

/** Sampled point along a route */
export interface SampledPoint {
  lat: number;
  lng: number;
  distance: number;
}

/** Coverage result for a sampled point */
export interface CoverageResult {
  point: SampledPoint;
  coverage: CoverageData;
  postcode?: string;
}

/** Route segment for distance calculation */
export interface RouteSegment {
  start: [number, number]; // [lng, lat]
  end: [number, number];   // [lng, lat]
  startDist: number;
  endDist: number;
  length: number;
}

/** Tile cache entry metadata */
export interface TileCacheEntry {
  timestamp: number;
  size: number;
  version: string;
}

/** Tile information for map overlay */
export interface TileInfo {
  url: string;
  bounds: Wgs84Bounds;
  tileX: number;
  tileY: number;
}

/** Coverage statistics for a network */
export interface NetworkSummaryStats {
  Excellent: number;
  Good: number;
  Adequate: number;
  'Poor/None': number;
  avgLevel: number;
  Rank?: number;
}

/** Chart data point */
export interface ChartDataPoint {
  x: number;
  y: number;
  postcode?: string;
  lat: number;
  lng: number;
}

/** Route result from Google Directions */
export interface RouteResult {
  coordinates: Array<[number, number]>; // [lng, lat] pairs
  distance: number;
  fullResult?: google.maps.DirectionsResult;
}

/** Logger interface for dependency injection */
export interface Logger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** Mobile Network Operator ID */
export type MnoId = 'mno1' | 'mno2' | 'mno3' | 'mno4';

/** Mobile Network Operator name */
export type OperatorName = 'Vodafone' | 'O2' | 'EE' | 'Three';

/** Coverage color map (level -> hex color) */
export type CoverageColorMap = Record<number, string>;
