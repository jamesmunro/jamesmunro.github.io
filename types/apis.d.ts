/**
 * API response type definitions for commute dashboard
 */

/** Huxley 2 train departure */
export interface HuxleyDeparture {
  std: string;
  etd: string;
  platform?: string;
  destination?: Array<{ locationName: string }>;
  operator?: string;
  isCancelled?: boolean;
  delayReason?: string;
  cancelReason?: string;
}

/** Huxley 2 API response */
export interface HuxleyResponse {
  trainServices?: HuxleyDeparture[];
  nrccMessages?: Array<{ value?: string } | string>;
}

/** Parsed train departure for display */
export interface TrainDeparture {
  scheduledTime: string;
  expectedTime: string;
  platform: string;
  destination: string;
  operator?: string;
  isCancelled: boolean;
  delayReason?: string;
  cancelReason?: string;
}

/** Train departures result */
export interface TrainDeparturesResult {
  departures: TrainDeparture[];
  messages: Array<{ value?: string } | string>;
}

/** TfL line status */
export interface TflLineStatus {
  statusSeverityDescription?: string;
  reason?: string;
}

/** TfL line response */
export interface TflLineResponse {
  lineStatuses?: TflLineStatus[];
}

/** Parsed line status */
export interface LineStatus {
  status: string;
  reason: string | null;
}

/** TfL arrival prediction */
export interface TflArrival {
  destinationName?: string;
  towards?: string;
  timeToStation: number;
  platformName?: string;
}

/** Parsed tube arrival for display */
export interface TubeArrival {
  destination: string;
  timeToStation: number;
  platformName?: string;
}

/** Open-Meteo API daily response */
export interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}

/** Open-Meteo API response */
export interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

/** Parsed weather forecast day */
export interface WeatherForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipProb: number;
}

/** Route configuration for a direction */
export interface RouteConfig {
  rail: { from: string; to: string };
  tube: { station: string; direction: string };
  railLabel: string;
  tubeLabel: string;
}

/** Commute direction */
export type CommuteDirection = 'toLondon' | 'toHome';

/** Cache entry with timestamp */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Station configuration */
export interface StationConfig {
  rail: {
    harpenden: string;
    stPancras: string;
  };
  tube: {
    kingsCross: string;
    piccadillyCircus: string;
  };
}
