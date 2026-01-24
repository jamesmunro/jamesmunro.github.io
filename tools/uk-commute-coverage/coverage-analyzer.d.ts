import { GoogleMap } from './google-map.js';
import type { Logger, CoverageResult, RouteResult, SampledPoint } from '../../types/coverage.js';
/** Configuration for CoverageAnalyzer */
interface CoverageAnalyzerConfig {
    logger?: Logger;
}
/**
 * Main Coverage Analyzer Application
 * Orchestrates the entire coverage analysis workflow
 */
export declare class CoverageAnalyzer {
    private logger;
    private chartRenderer;
    googleMap: GoogleMap;
    private coverageAdapter;
    private currentStep;
    private steps;
    private googleMapsLoaded;
    private googleMapsLoadingPromise;
    currentRouteCoordinates: Array<[number, number]> | null;
    lastRouteResult: RouteResult | null;
    constructor({ logger }?: CoverageAnalyzerConfig);
    /**
     * Initialize the application listeners
     */
    init(): Promise<void>;
    private loadFormValues;
    private saveFormValues;
    private handleSubmit;
    loadGoogleMapsApi(apiKey: string): Promise<typeof google.maps>;
    /**
     * Fetches the route between two postcodes.
     */
    getRoute(startPostcode: string, endPostcode: string, apiKey: string, profile?: string): Promise<RouteResult>;
    analyzeRoute(startPostcode: string, endPostcode: string, apiKey: string, profile: string, tileNetwork?: string, prefetchedRoute?: RouteResult | null): Promise<void>;
    validatePostcode(postcode: string): void;
    postcodeToCoordinates(postcode: string): Promise<google.maps.LatLng>;
    fetchRoute(start: string | google.maps.LatLng, end: string | google.maps.LatLng, profile?: string): Promise<RouteResult>;
    getCoverageData(sampledPoints: SampledPoint[], startPostcode: string, endPostcode: string, tileNetwork?: string): Promise<CoverageResult[]>;
    updateMapTiles(tileNetwork: string, coordinates: Array<[number, number]>): Promise<void>;
    private showProgress;
    private hideProgress;
    private updateProgress;
    private updateCacheMonitor;
    private setStep;
    private completeStep;
    showElement(id: string): void;
    hideElement(id: string): void;
    showError(message: string): void;
}
export {};
