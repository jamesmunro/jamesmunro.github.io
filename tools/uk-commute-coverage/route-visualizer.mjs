
import { CoverageAnalyzer } from './coverage-analyzer.mjs';
import { LeafletMap } from './leaflet-map.mjs';

export async function previewRoute(startPostcode, endPostcode, apiKey, logger = console) {
  const analyzer = new CoverageAnalyzer({ logger });
  const map = new LeafletMap('map-container', logger);

  try {
    logger.log('Fetching route...');
    const route = await analyzer.getRoute(startPostcode, endPostcode, apiKey);
    logger.log('Route fetched successfully.');
    map.drawRoute(route.coordinates);
  } catch (error) {
    logger.error('Failed to preview route:', error);
    throw error;
  }
}
