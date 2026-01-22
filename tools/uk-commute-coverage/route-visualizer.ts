import { CoverageAnalyzer } from './coverage-analyzer.js';
import { GoogleMap } from './google-map.js';
import type { Logger } from '../../types/coverage.js';

export async function previewRoute(
  startPostcode: string,
  endPostcode: string,
  apiKey: string,
  profile = 'driving-car',
  logger: Logger = console
): Promise<void> {
  const analyzer = new CoverageAnalyzer({ logger });
  const map = new GoogleMap('map-container', logger);

  try {
    logger.log('Fetching route...');
    const route = await analyzer.getRoute(startPostcode, endPostcode, apiKey, profile);
    logger.log('Route fetched successfully.');

    // In a real browser environment, getRoute ensures google maps is loaded.
    // For the map, we need to initialize it.
    await map.initMap();

    if (route.fullResult) {
      map.setDirections(route.fullResult);
    } else {
      map.drawRoute(route.coordinates);
    }
  } catch (error) {
    logger.error('Failed to preview route:', error);
    throw error;
  }
}
