/**
 * Route Sampling Module
 * Provides functions for sampling points along a route at regular intervals
 */
import type { SampledPoint } from '../../types/coverage.js';
/** Coordinate pair [longitude, latitude] */
type Coordinate = [number, number];
/**
 * Calculate distance between two geographic points using Haversine formula
 * @param point1 - [longitude, latitude]
 * @param point2 - [longitude, latitude]
 * @returns Distance in meters
 */
export declare function haversineDistance(point1: Coordinate, point2: Coordinate): number;
/**
 * Sample points along a route at regular intervals
 * @param coordinates - Array of [longitude, latitude] pairs from route
 * @param intervalMeters - Distance between sample points (default 500m)
 * @returns Array of sampled points with {lat, lng, distance}
 */
export declare function sampleRoute(coordinates: Coordinate[], intervalMeters?: number): SampledPoint[];
/**
 * Get total distance of a route
 * @param coordinates - Array of [longitude, latitude] pairs
 * @returns Total distance in meters
 */
export declare function getTotalDistance(coordinates: Coordinate[]): number;
/**
 * Sample a specific number of points evenly along a route
 * @param coordinates - Array of [longitude, latitude] pairs from route
 * @param targetSamples - Target number of sample points (default 500)
 */
export declare function sampleRouteByCount(coordinates: Coordinate[], targetSamples?: number): SampledPoint[];
export {};
