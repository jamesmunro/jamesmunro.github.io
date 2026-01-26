import type { TrainDeparturesResult, LineStatus, TubeArrival, WeatherForecast, RouteConfig, CommuteDirection, StationConfig } from '../../types/apis.js';
export declare const STATIONS: StationConfig;
/**
 * Get default direction based on time of day
 * Before 12pm on weekdays = toLondon, after = toHome
 * @param now - Optional date for testing
 * @returns 'toLondon' | 'toHome'
 */
export declare function getDefaultDirection(now?: Date): CommuteDirection;
/**
 * Get the next business day from a given date
 * @param date - Starting date
 * @returns Next business day
 */
export declare function getNextBusinessDay(date: Date): Date;
/**
 * Format time from ISO string or Date to HH:MM
 * @param time - ISO string or Date
 * @returns Formatted time string
 */
export declare function formatTime(time: string | Date): string;
/**
 * Format delay in minutes as human readable string
 * @param minutes - Delay in minutes (can be negative for early)
 * @returns Human readable delay string
 */
export declare function formatDelay(minutes: number | null | undefined): string;
/**
 * Fetch train departures from Huxley 2
 * @param from - Origin station code (e.g., 'HPD')
 * @param to - Destination station code (e.g., 'STP')
 * @returns Train departures result
 */
export declare function fetchTrainDepartures(from: string, to: string): Promise<TrainDeparturesResult>;
/**
 * Fetch TfL line status
 * @param lineId - Line ID (e.g., 'piccadilly')
 * @returns Line status
 */
export declare function fetchLineStatus(lineId: string): Promise<LineStatus>;
/**
 * Fetch tube arrivals at a station for a specific line
 * @param stationId - Station NAPTAN ID
 * @param lineId - Line ID (e.g., 'piccadilly')
 * @returns Array of tube arrivals
 */
export declare function fetchTubeArrivals(stationId: string, lineId: string): Promise<TubeArrival[]>;
/**
 * Fetch weather forecast
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Array of weather forecasts
 */
export declare function fetchWeather(lat?: number, lon?: number): Promise<WeatherForecast[]>;
/**
 * Convert WMO weather code to description
 * @param code - WMO weather code
 * @returns Weather description
 */
export declare function weatherCodeToDescription(code: number): string;
/**
 * Get route configuration based on direction
 * @param direction - 'toLondon' or 'toHome'
 * @returns Route configuration
 */
export declare function getRouteConfig(direction: CommuteDirection): RouteConfig;
