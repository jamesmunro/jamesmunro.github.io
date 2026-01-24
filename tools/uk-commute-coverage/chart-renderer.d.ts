/**
 * Chart Renderer Module
 * Handles rendering the coverage visualization as horizontal stacked bars
 */
import type { CoverageResult, NetworkSummaryStats, NetworkCoverageResult } from '../../types/coverage.js';
/** A segment of consecutive coverage points with same level */
interface CoverageSegment {
    level: number;
    startDistance: number;
    endDistance: number;
    postcodes: string[];
    widthPercent: number;
}
export declare class ChartRenderer {
    private containerId;
    private summaryData;
    private tableBodyId;
    private currentSort;
    constructor(containerId: string);
    /**
     * Determine signal level from coverage data
     * @param networkData - Coverage data for a network {level, color, description}
     * @returns Signal level (0-4 from tile API, or 0 if no data)
     */
    getSignalLevel(networkData: NetworkCoverageResult | undefined): number;
    /**
     * Group coverage results into segments of consecutive same-level coverage
     * @param coverageResults - Array of coverage results
     * @param network - Network name to extract coverage for
     * @returns Array of coverage segments
     */
    groupIntoSegments(coverageResults: CoverageResult[], network: string): CoverageSegment[];
    /**
     * Render the coverage visualization as horizontal bars
     * @param coverageResults - Array of coverage results
     */
    render(coverageResults: CoverageResult[]): void;
    /**
     * Format tooltip text for a coverage segment
     */
    private formatSegmentTooltip;
    /**
     * Calculate summary statistics
     * @param coverageResults - Array of coverage results
     * @returns Summary stats per network (cumulative "or better" percentages)
     */
    calculateSummary(coverageResults: CoverageResult[]): Record<string, NetworkSummaryStats>;
    /**
     * Render summary table
     * @param coverageResults - Array of coverage results
     * @param tableBodyId - ID of table body element
     */
    renderSummary(coverageResults: CoverageResult[], tableBodyId: string): void;
    /**
     * Setup click handlers for sortable column headers
     */
    private setupSortableHeaders;
    /**
     * Update sort indicators on headers
     */
    private updateSortIndicators;
    /**
     * Render summary table rows with sorting
     */
    private renderSummaryRows;
}
export {};
