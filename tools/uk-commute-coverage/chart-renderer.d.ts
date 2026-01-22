/**
 * Chart Renderer Module
 * Handles rendering the coverage visualization using Chart.js
 */
import type { ChartDataset } from 'chart.js';
import type { CoverageResult, NetworkSummaryStats, ChartDataPoint, NetworkCoverageResult } from '../../types/coverage.js';
export declare class ChartRenderer {
    private canvasId;
    private chart;
    private summaryData;
    private tableBodyId;
    private currentSort;
    constructor(canvasId: string);
    /**
     * Determine signal level from coverage data
     * @param networkData - Coverage data for a network {level, color, description}
     * @returns Signal level (0-4 from tile API, or 0 if no data)
     */
    getSignalLevel(networkData: NetworkCoverageResult | undefined): number;
    /**
     * Prepare chart data from coverage results
     * @param coverageResults - Array of {point, coverage} objects
     * @returns Chart.js datasets
     */
    prepareChartData(coverageResults: CoverageResult[]): ChartDataset<'line', ChartDataPoint[]>[];
    /**
     * Render the coverage chart
     * @param coverageResults - Array of coverage results
     */
    render(coverageResults: CoverageResult[]): void;
    /**
     * Calculate summary statistics
     * @param coverageResults - Array of coverage results
     * @returns Summary stats per network
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
