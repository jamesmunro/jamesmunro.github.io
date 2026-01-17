// Commute Dashboard - API and helper functions
// Station codes
export const STATIONS = {
  rail: {
    harpenden: 'HPD',
    stPancras: 'STP'
  },
  tube: {
    kingsCross: '940GZZLUKSX',
    piccadillyCircus: '940GZZLUPCC'
  }
};

// API endpoints
const HUXLEY_BASE = 'https://huxley2.azurewebsites.net';
const TFL_BASE = 'https://api.tfl.gov.uk';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';

// Coordinates for weather
const HARPENDEN_COORDS = { lat: 51.8156, lon: -0.3566 };

// Cache configuration (in milliseconds)
const CACHE_TTL = {
  trains: 5 * 60 * 1000,    // 5 minutes
  tube: 2 * 60 * 1000,      // 2 minutes
  weather: 30 * 60 * 1000   // 30 minutes
};

/**
 * Get default direction based on time of day
 * Before 12pm on weekdays = toLondon, after = toHome
 * @param {Date} [now] - Optional date for testing
 * @returns {'toLondon' | 'toHome'}
 */
export function getDefaultDirection(now = new Date()) {
  const day = now.getDay();
  const hour = now.getHours();

  // Weekend: default to London direction (assumption: leisure trips)
  if (day === 0 || day === 6) {
    return 'toLondon';
  }

  // Weekday: morning = to London, afternoon/evening = to home
  return hour < 12 ? 'toLondon' : 'toHome';
}

/**
 * Get the next business day from a given date
 * @param {Date} date - Starting date
 * @returns {Date} - Next business day
 */
export function getNextBusinessDay(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);

  // Skip Saturday (6) and Sunday (0)
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Format time from ISO string or Date to HH:MM
 * @param {string | Date} time
 * @returns {string}
 */
export function formatTime(time) {
  const date = typeof time === 'string' ? new Date(time) : time;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format delay in minutes as human readable string
 * @param {number} minutes - Delay in minutes (can be negative for early)
 * @returns {string}
 */
export function formatDelay(minutes) {
  if (minutes === 0 || minutes === null || minutes === undefined) {
    return 'On time';
  }
  if (minutes < 0) {
    return `${Math.abs(minutes)} min early`;
  }
  return `${minutes} min late`;
}

/**
 * Get cached data if valid
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in ms
 * @returns {any | null}
 */
function getCache(key, ttl) {
  try {
    const cached = localStorage.getItem(`commute_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Set cache data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCache(key, data) {
  try {
    localStorage.setItem(`commute_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore cache errors (e.g., quota exceeded)
  }
}

/**
 * Fetch train departures from Huxley 2
 * @param {string} from - Origin station code (e.g., 'HPD')
 * @param {string} to - Destination station code (e.g., 'STP')
 * @returns {Promise<{departures: Array, messages: Array}>}
 */
export async function fetchTrainDepartures(from, to) {
  const cacheKey = `trains_${from}_${to}`;
  const cached = getCache(cacheKey, CACHE_TTL.trains);
  if (cached) return cached;

  const url = `${HUXLEY_BASE}/departures/${from}/to/${to}?expand=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Train API error: ${response.status}`);
  }

  const data = await response.json();

  const result = {
    departures: (data.trainServices || []).slice(0, 5).map(service => ({
      scheduledTime: service.std,
      expectedTime: service.etd,
      platform: service.platform || '-',
      destination: service.destination?.[0]?.locationName || to,
      operator: service.operator,
      isCancelled: service.isCancelled || false,
      delayReason: service.delayReason,
      cancelReason: service.cancelReason
    })),
    messages: data.nrccMessages || []
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch TfL line status
 * @param {string} lineId - Line ID (e.g., 'piccadilly')
 * @returns {Promise<{status: string, reason: string | null}>}
 */
export async function fetchLineStatus(lineId) {
  const cacheKey = `line_status_${lineId}`;
  const cached = getCache(cacheKey, CACHE_TTL.tube);
  if (cached) return cached;

  const url = `${TFL_BASE}/Line/${lineId}/Status`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TfL API error: ${response.status}`);
  }

  const data = await response.json();
  const lineStatus = data[0]?.lineStatuses?.[0];

  const result = {
    status: lineStatus?.statusSeverityDescription || 'Unknown',
    reason: lineStatus?.reason || null
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch tube arrivals at a station for a specific line
 * @param {string} stationId - Station NAPTAN ID
 * @param {string} lineId - Line ID (e.g., 'piccadilly')
 * @returns {Promise<Array<{destination: string, timeToStation: number}>>}
 */
export async function fetchTubeArrivals(stationId, lineId) {
  const cacheKey = `arrivals_${stationId}_${lineId}`;
  const cached = getCache(cacheKey, CACHE_TTL.tube);
  if (cached) return cached;

  const url = `${TFL_BASE}/Line/${lineId}/Arrivals/${stationId}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TfL API error: ${response.status}`);
  }

  const data = await response.json();

  const result = data
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, 4)
    .map(arrival => ({
      destination: arrival.destinationName || arrival.towards,
      timeToStation: Math.round(arrival.timeToStation / 60), // Convert to minutes
      platformName: arrival.platformName
    }));

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch weather forecast
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array<{date: string, tempMax: number, tempMin: number, weatherCode: number, precipProb: number}>>}
 */
export async function fetchWeather(lat = HARPENDEN_COORDS.lat, lon = HARPENDEN_COORDS.lon) {
  const cacheKey = `weather_${lat}_${lon}`;
  const cached = getCache(cacheKey, CACHE_TTL.weather);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Europe/London',
    forecast_days: '7'
  });

  const url = `${WEATHER_BASE}?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  const result = data.daily.time.map((date, i) => ({
    date,
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    weatherCode: data.daily.weather_code[i],
    precipProb: data.daily.precipitation_probability_max[i]
  }));

  setCache(cacheKey, result);
  return result;
}

/**
 * Convert WMO weather code to description
 * @param {number} code - WMO weather code
 * @returns {string}
 */
export function weatherCodeToDescription(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Light snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm'
  };
  return codes[code] || 'Unknown';
}

/**
 * Get route configuration based on direction
 * @param {'toLondon' | 'toHome'} direction
 * @returns {{rail: {from: string, to: string}, tube: {station: string, direction: string}}}
 */
export function getRouteConfig(direction) {
  if (direction === 'toLondon') {
    return {
      rail: { from: STATIONS.rail.harpenden, to: STATIONS.rail.stPancras },
      tube: { station: STATIONS.tube.kingsCross, direction: 'southbound' },
      railLabel: 'Harpenden to St Pancras',
      tubeLabel: "King's Cross to Piccadilly Circus"
    };
  }
  return {
    rail: { from: STATIONS.rail.stPancras, to: STATIONS.rail.harpenden },
    tube: { station: STATIONS.tube.piccadillyCircus, direction: 'northbound' },
    railLabel: 'St Pancras to Harpenden',
    tubeLabel: "Piccadilly Circus to King's Cross"
  };
}
