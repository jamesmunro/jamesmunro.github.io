/**
 * Route Sampling Module
 * Provides functions for sampling points along a route at regular intervals
 */

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {Array} point1 - [longitude, latitude]
 * @param {Array} point2 - [longitude, latitude]
 * @returns {number} Distance in meters
 */
function haversineDistance(point1, point2) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  const R = 6371000; // Earth radius in meters

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Sample points along a route at regular intervals
 * @param {Array} coordinates - Array of [longitude, latitude] pairs from route
 * @param {number} intervalMeters - Distance between sample points (default 500m)
 * @returns {Array} Array of sampled points with {lat, lng, distance}
 */
function sampleRoute(coordinates, intervalMeters = 500) {
  if (!coordinates || coordinates.length < 2) {
    throw new Error('Route must have at least 2 points');
  }

  const points = [];
  let distanceAlongRoute = 0;

  // Always include the first point
  points.push({
    lat: coordinates[0][1],
    lng: coordinates[0][0],
    distance: 0
  });

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [p1, p2] = [coordinates[i], coordinates[i + 1]];
    const segmentDist = haversineDistance(p1, p2);

    if (segmentDist === 0) continue; // Skip zero-length segments

    const numSamples = Math.ceil(segmentDist / intervalMeters);

    // Sample points along this segment (skip j=0 to avoid duplicates)
    for (let j = 1; j <= numSamples; j++) {
      const fraction = j / numSamples;
      const newDistance = distanceAlongRoute + segmentDist * fraction;

      points.push({
        lat: p1[1] + (p2[1] - p1[1]) * fraction,
        lng: p1[0] + (p2[0] - p1[0]) * fraction,
        distance: newDistance
      });
    }

    distanceAlongRoute += segmentDist;
  }

  return points;
}

/**
 * Get total distance of a route
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @returns {number} Total distance in meters
 */
function getTotalDistance(coordinates) {
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversineDistance(coordinates[i], coordinates[i + 1]);
  }
  return total;
}

// Export for use in other modules and tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { haversineDistance, sampleRoute, getTotalDistance };
}
