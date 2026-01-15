/**
 * Mobile Coverage Tool
 * Uses linear interpolation for route sampling (no haversine/earth curvature)
 */

/**
 * Calculate the linear distance between two points
 * Uses simple Euclidean distance (no earth curvature)
 * @param {[number, number]} point1 - [lat, lng]
 * @param {[number, number]} point2 - [lat, lng]
 * @returns {number} Distance in kilometers
 */
export function calculateLinearDistance(point1, point2) {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;

  // Simple linear distance approximation
  // At mid-latitudes, 1 degree ≈ 111km for latitude, varies for longitude
  const avgLat = (lat1 + lat2) / 2;
  const latDiff = (lat2 - lat1) * 111; // km per degree latitude
  const lngDiff = (lng2 - lng1) * 111 * Math.cos(avgLat * Math.PI / 180); // adjusted for longitude

  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

/**
 * Calculate total route distance
 * @param {Array<[number, number]>} waypoints - Array of [lat, lng] points
 * @returns {number} Total distance in kilometers
 */
export function calculateRouteDistance(waypoints) {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateLinearDistance(waypoints[i], waypoints[i + 1]);
  }

  return totalDistance;
}

/**
 * Linearly interpolate between two points
 * @param {[number, number]} point1 - Start point [lat, lng]
 * @param {[number, number]} point2 - End point [lat, lng]
 * @param {number} t - Interpolation factor (0 to 1)
 * @returns {[number, number]} Interpolated point [lat, lng]
 */
export function linearInterpolate(point1, point2, t) {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;

  return [
    lat1 + (lat2 - lat1) * t,
    lng1 + (lng2 - lng1) * t
  ];
}

/**
 * Generate sample points along a route using linear interpolation
 * @param {Array<[number, number]>} waypoints - Array of waypoints [lat, lng]
 * @param {number} numSamples - Number of samples to generate (default: 150)
 * @returns {Array<[number, number]>} Array of sample points [lat, lng]
 */
export function interpolateRoute(waypoints, numSamples = 150) {
  if (waypoints.length < 2) return [];
  if (waypoints.length === 2) {
    // Simple case: just interpolate between two points
    const samples = [];
    for (let i = 0; i < numSamples; i++) {
      const t = i / (numSamples - 1);
      samples.push(linearInterpolate(waypoints[0], waypoints[1], t));
    }
    return samples;
  }

  // Calculate distance for each segment
  const segmentDistances = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = calculateLinearDistance(waypoints[i], waypoints[i + 1]);
    segmentDistances.push(dist);
    totalDistance += dist;
  }

  // Calculate how many samples per segment based on distance
  const samples = [];
  let samplesAllocated = 0;

  for (let i = 0; i < segmentDistances.length; i++) {
    const segmentRatio = segmentDistances[i] / totalDistance;
    let segmentSamples;

    if (i === segmentDistances.length - 1) {
      // Last segment gets remaining samples
      segmentSamples = numSamples - samplesAllocated;
    } else {
      // Allocate samples proportionally to distance
      segmentSamples = Math.max(1, Math.round(segmentRatio * numSamples));
      samplesAllocated += segmentSamples;
    }

    // Generate samples for this segment
    for (let j = 0; j < segmentSamples; j++) {
      const t = j / segmentSamples;
      const point = linearInterpolate(waypoints[i], waypoints[i + 1], t);
      samples.push(point);
    }
  }

  // Ensure we have exactly numSamples
  while (samples.length > numSamples) {
    samples.pop();
  }
  while (samples.length < numSamples) {
    samples.push(waypoints[waypoints.length - 1]);
  }

  return samples;
}

/**
 * Calculate adaptive sample spacing for a route
 * @param {Array<[number, number]>} waypoints - Array of waypoints [lat, lng]
 * @param {number} numSamples - Number of samples (default: 150)
 * @returns {number} Distance between samples in kilometers
 */
export function calculateSampleSpacing(waypoints, numSamples = 150) {
  const totalDistance = calculateRouteDistance(waypoints);
  return totalDistance / numSamples;
}

/**
 * Simulate mobile coverage sampling at a point
 * In production, this would call a real coverage API
 * @param {[number, number]} point - [lat, lng]
 * @returns {Object} Coverage data { signal: number, quality: string }
 */
export function simulateCoverageSample(point) {
  // Simulate signal strength (-120 to -40 dBm)
  // Add some randomness and spatial variation
  const [lat, lng] = point;
  const spatialVariation = Math.sin(lat * 100) * Math.cos(lng * 100) * 20;
  const randomNoise = (Math.random() - 0.5) * 30;
  const baseSignal = -70;

  let signal = baseSignal + spatialVariation + randomNoise;
  signal = Math.max(-120, Math.min(-40, signal));

  // Determine quality based on signal strength
  let quality;
  if (signal >= -65) {
    quality = 'excellent';
  } else if (signal >= -75) {
    quality = 'good';
  } else if (signal >= -90) {
    quality = 'fair';
  } else {
    quality = 'poor';
  }

  return {
    signal: Math.round(signal),
    quality
  };
}
