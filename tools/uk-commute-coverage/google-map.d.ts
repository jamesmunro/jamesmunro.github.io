/**
 * Google Maps integration module
 * Handles map initialization, route display, and tile overlays
 */
import type { Logger, Wgs84Bounds } from '../../types/coverage.js';
export declare class GoogleMap {
    private containerId;
    private logger;
    map: google.maps.Map | null;
    private directionsRenderer;
    private renderers;
    private overlays;
    constructor(containerId: string, logger?: Logger);
    initMap(): Promise<void>;
    /**
     * Clear all directions renderers
     */
    clearDirections(): void;
    /**
     * Add a tile overlay to the map
     * @param url - URL of the tile image
     * @param bounds - {south, west, north, east}
     * @param opacity - Opacity of the overlay (0-1)
     */
    addTileOverlay(url: string, bounds: Wgs84Bounds, opacity?: number): google.maps.GroundOverlay | undefined;
    /**
     * Clear all overlays from the map
     */
    clearOverlays(): void;
    /**
     * Draw a route on the map
     * @param coordinates - Array of [longitude, latitude] pairs
     */
    drawRoute(coordinates: Array<[number, number]>): void;
    /**
     * Show all routes from a directions result
     */
    setDirections(directionsResult: google.maps.DirectionsResult): void;
    /**
     * Select a specific route by index
     */
    selectRoute(index: number): void;
    /**
     * Listen for directions changes (e.g. when user selects an alternative route)
     * @param callback - Function called with the new directions result
     */
    onDirectionsChanged(callback: (result: google.maps.DirectionsResult) => void): void;
}
