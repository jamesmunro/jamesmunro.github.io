/**
 * Chart Renderer Module
 * Handles rendering the coverage visualization using Chart.js
 */

import type { Chart as ChartJS, ChartConfiguration, ChartDataset, TooltipItem } from 'chart.js';
import type { CoverageResult, NetworkSummaryStats, ChartDataPoint, CoverageLevel, NetworkCoverageResult } from '../../types/coverage.js';
import { NETWORK_COLORS, NETWORKS } from './constants.js';

// Canonical Ofcom coverage level descriptions (used throughout)
const COVERAGE_LEVELS: Record<number, string> = {
  4: 'Good outdoor and in-home',
  3: 'Good outdoor, variable in-home',
  2: 'Good outdoor',
  1: 'Variable outdoor',
  0: 'Poor to none outdoor'
};

// Short labels for chart Y-axis
const COVERAGE_LABELS_SHORT: Record<number, string> = {
  4: 'In-home',
  3: 'Variable in-home',
  2: 'Outdoor',
  1: 'Variable',
  0: 'Poor/None'
};

/** Sort configuration state */
interface SortConfig {
  column: string;
  descending: boolean;
}

export class ChartRenderer {
  private canvasId: string;
  private chart: ChartJS | null;
  private summaryData: Record<string, NetworkSummaryStats> | null;
  private tableBodyId: string | null;
  private currentSort: SortConfig;

  constructor(canvasId: string) {
    this.canvasId = canvasId;
    this.chart = null;
    this.summaryData = null;
    this.tableBodyId = null;
    this.currentSort = { column: 'Rank', descending: false };
  }

  /**
   * Determine signal level from coverage data
   * @param networkData - Coverage data for a network {level, color, description}
   * @returns Signal level (0-4 from tile API, or 0 if no data)
   */
  getSignalLevel(networkData: NetworkCoverageResult | undefined): number {
    if (!networkData) return 0;
    if (networkData.error) return 0;
    if (typeof networkData.level === 'number') {
      return Math.max(0, Math.min(4, networkData.level)); // Clamp to 0-4
    }
    return 0;
  }

  /**
   * Prepare chart data from coverage results
   * @param coverageResults - Array of {point, coverage} objects
   * @returns Chart.js datasets
   */
  prepareChartData(coverageResults: CoverageResult[]): ChartDataset<'line', ChartDataPoint[]>[] {
    const datasets = NETWORKS.map(network => {
      const data: ChartDataPoint[] = coverageResults.map(result => ({
        x: (result.point.distance || 0) / 1000, // Convert to km
        y: this.getSignalLevel(result.coverage?.networks?.[network]),
        postcode: result.postcode,
        lat: typeof result.point.lat === 'number' ? result.point.lat : NaN,
        lng: typeof result.point.lng === 'number' ? result.point.lng : NaN
      }));

      return {
        label: network,
        data: data,
        borderColor: NETWORK_COLORS[network],
        backgroundColor: NETWORK_COLORS[network] + '20', // Add transparency
        borderWidth: 2,
        tension: 0,
        stepped: false,
        pointRadius: 2,
        pointHoverRadius: 5
      } as ChartDataset<'line', ChartDataPoint[]>;
    });

    return datasets;
  }

  /**
   * Render the coverage chart
   * @param coverageResults - Array of coverage results
   */
  render(coverageResults: CoverageResult[]): void {
    let canvas = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error(`Canvas element ${this.canvasId} not found`);
    }

    // Check for and destroy any existing chart instance on this canvas
    const existingChart = (Chart as unknown as { getChart(canvas: HTMLCanvasElement): ChartJS | undefined }).getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    // Also destroy the instance tracked by this class
    if (this.chart) {
      this.chart.destroy();
    }

    // Create a fresh canvas element to ensure no lingering state
    const newCanvas = document.createElement('canvas');
    newCanvas.id = this.canvasId;
    newCanvas.className = canvas.className; // Preserve classes

    canvas.parentNode?.replaceChild(newCanvas, canvas);
    canvas = newCanvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas 2D context');
    }

    const datasets = this.prepareChartData(coverageResults);

    const config: ChartConfiguration<'line', ChartDataPoint[]> = {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Distance (km)'
            },
            ticks: {
              callback: function(value) {
                return (value as number).toFixed(1);
              }
            }
          },
          y: {
            type: 'linear',
            min: 0,
            max: 4,
            title: {
              display: true,
              text: 'Coverage Level'
            },
            ticks: {
              stepSize: 1,
              callback: function(value) {
                return COVERAGE_LABELS_SHORT[value as number] || '';
              }
            }
          }
        },
        plugins: {
          // chartjs-plugin-zoom types not in base Chart.js
          ...({
            zoom: {
              pan: {
                enabled: true,
                mode: 'x',
                threshold: 10
              },
              zoom: {
                wheel: {
                  enabled: true,
                },
                pinch: {
                  enabled: true
                },
                mode: 'x',
              }
            }
          } as Record<string, unknown>),
          tooltip: {
            callbacks: {
              title: function(context: TooltipItem<'line'>[]) {
                const point = context[0].raw as ChartDataPoint;
                return `Distance: ${point.x.toFixed(2)} km`;
              },
              label: function(context: TooltipItem<'line'>) {
                const y = context.parsed.y;
                const levelLabel = y != null ? (COVERAGE_LEVELS[y] || 'Unknown') : 'Unknown';
                return `${context.dataset.label}: ${levelLabel}`;
              },
              afterLabel: function(context: TooltipItem<'line'>) {
                const point = context.raw as ChartDataPoint;
                const postcodeLine = point.postcode ? `Postcode: ${point.postcode}\n` : '';
                const latStr = (typeof point.lat === 'number' && !isNaN(point.lat)) ? point.lat.toFixed(4) : 'N/A';
                const lngStr = (typeof point.lng === 'number' && !isNaN(point.lng)) ? point.lng.toFixed(4) : 'N/A';
                return `${postcodeLine}Lat: ${latStr}, Lng: ${lngStr}`;
              }
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    };

    this.chart = new Chart(ctx, config as ChartConfiguration) as ChartJS;
  }

  /**
   * Calculate summary statistics
   * @param coverageResults - Array of coverage results
   * @returns Summary stats per network
   */
  calculateSummary(coverageResults: CoverageResult[]): Record<string, NetworkSummaryStats> {
    const summary: Record<string, NetworkSummaryStats> = {};

    NETWORKS.forEach(network => {
      const levels = coverageResults.map(result =>
        this.getSignalLevel(result.coverage?.networks?.[network])
      );

      const total = levels.length;
      // Count points with good coverage (level 2+) and excellent (level 3+)
      const excellent = levels.filter(l => l >= 3).length;
      const good = levels.filter(l => l >= 2).length;
      const adequate = levels.filter(l => l >= 1).length;
      const poorNone = levels.filter(l => l === 0).length;

      summary[network] = {
        'Excellent': total > 0 ? Math.round((excellent / total) * 100) : 0,
        'Good': total > 0 ? Math.round((good / total) * 100) : 0,
        'Adequate': total > 0 ? Math.round((adequate / total) * 100) : 0,
        'Poor/None': total > 0 ? Math.round((poorNone / total) * 100) : 0,
        avgLevel: total > 0 ? (levels.reduce((a, b) => a + b, 0) / total) : 0
      };
    });

    return summary;
  }

  /**
   * Render summary table
   * @param coverageResults - Array of coverage results
   * @param tableBodyId - ID of table body element
   */
  renderSummary(coverageResults: CoverageResult[], tableBodyId: string): void {
    const summary = this.calculateSummary(coverageResults);
    const tbody = document.getElementById(tableBodyId) as HTMLTableSectionElement | null;

    if (!tbody) {
      throw new Error(`Table body element ${tableBodyId} not found`);
    }

    // Calculate ranks based on avgLevel (descending)
    const networksRanked = Object.entries(summary)
      .sort((a, b) => b[1].avgLevel - a[1].avgLevel);

    let currentRank = 1;
    networksRanked.forEach(([network, stats], index) => {
      if (index > 0) {
        const prevStats = networksRanked[index - 1][1];
        if (stats.avgLevel < prevStats.avgLevel) {
          currentRank = index + 1;
        }
      }
      summary[network]['Rank'] = currentRank;
    });

    // Store summary data for sorting
    this.summaryData = summary;
    this.tableBodyId = tableBodyId;
    this.currentSort = { column: 'Rank', descending: false };

    // Setup sortable headers
    this.setupSortableHeaders(tbody);

    // Initial render sorted by best coverage
    this.renderSummaryRows(summary, tbody, 'avgLevel', true);
  }

  /**
   * Setup click handlers for sortable column headers
   */
  private setupSortableHeaders(tbody: HTMLTableSectionElement): void {
    const table = tbody.closest('table');
    if (!table) return;

    const headers = table.querySelectorAll('th');
    const sortableColumns: Record<number, string> = {
      1: 'Excellent',
      2: 'Good',
      3: 'Adequate',
      4: 'Poor/None',
      5: 'Rank'
    };

    headers.forEach((th, index) => {
      if (sortableColumns[index]) {
        th.style.cursor = 'pointer';
        th.title = 'Click to sort';
        th.onclick = () => {
          const column = sortableColumns[index];
          const descending = this.currentSort.column === column ? !this.currentSort.descending : true;
          this.currentSort = { column, descending };
          if (this.summaryData) {
            this.renderSummaryRows(this.summaryData, tbody, column, descending);
          }
          this.updateSortIndicators(headers, index, descending);
        };
      }
    });
  }

  /**
   * Update sort indicators on headers
   */
  private updateSortIndicators(headers: NodeListOf<HTMLTableCellElement>, activeIndex: number, descending: boolean): void {
    headers.forEach((th, index) => {
      // Remove existing indicators
      th.textContent = th.textContent?.replace(/ [▲▼]$/, '') || '';
      if (index === activeIndex) {
        th.textContent += descending ? ' ▼' : ' ▲';
      }
    });
  }

  /**
   * Render summary table rows with sorting
   */
  private renderSummaryRows(summary: Record<string, NetworkSummaryStats>, tbody: HTMLTableSectionElement, sortColumn: string, descending: boolean): void {
    tbody.innerHTML = '';

    // Sort networks by specified column for display
    const networksSorted = Object.entries(summary)
      .sort((a, b) => {
        const aVal = (a[1] as unknown as Record<string, number>)[sortColumn];
        const bVal = (b[1] as unknown as Record<string, number>)[sortColumn];
        return descending ? bVal - aVal : aVal - bVal;
      });

    networksSorted.forEach(([network, stats]) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${network}</strong></td>
        <td>${stats['Excellent']}%</td>
        <td>${stats['Good']}%</td>
        <td>${stats['Adequate']}%</td>
        <td>${stats['Poor/None']}%</td>
        <td>${stats['Rank']}</td>
      `;
    });
  }
}
