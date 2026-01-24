/**
 * Chart Renderer Module
 * Handles rendering the coverage visualization as horizontal stacked bars
 */

import type { CoverageResult, NetworkSummaryStats, NetworkCoverageResult } from '../../types/coverage.js';
import { COVERAGE_COLORS, NETWORKS } from './constants.js';

// Canonical Ofcom coverage level descriptions (used throughout)
const COVERAGE_LEVELS: Record<number, string> = {
  4: 'Good outdoor and in-home',
  3: 'Good outdoor, variable in-home',
  2: 'Good outdoor',
  1: 'Variable outdoor',
  0: 'Poor to none outdoor'
};

// Short labels for legend
const COVERAGE_LABELS_SHORT: Record<number, string> = {
  4: 'Indoor+',
  3: 'Indoor',
  2: 'Outdoor',
  1: 'Variable',
  0: 'Poor/None'
};

/** Sort configuration state */
interface SortConfig {
  column: string;
  descending: boolean;
}

/** A segment of consecutive coverage points with same level */
interface CoverageSegment {
  level: number;
  startDistance: number;
  endDistance: number;
  postcodes: string[];
  widthPercent: number;
}

export class ChartRenderer {
  private containerId: string;
  private summaryData: Record<string, NetworkSummaryStats> | null;
  private tableBodyId: string | null;
  private currentSort: SortConfig;

  constructor(containerId: string) {
    this.containerId = containerId;
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
   * Group coverage results into segments of consecutive same-level coverage
   * @param coverageResults - Array of coverage results
   * @param network - Network name to extract coverage for
   * @returns Array of coverage segments
   */
  groupIntoSegments(coverageResults: CoverageResult[], network: string): CoverageSegment[] {
    if (coverageResults.length === 0) return [];

    const totalDistance = (coverageResults[coverageResults.length - 1].point.distance || 0) / 1000;
    if (totalDistance === 0) return [];

    const segments: CoverageSegment[] = [];
    let currentLevel = this.getSignalLevel(coverageResults[0].coverage?.networks?.[network]);
    let startDistance = 0;
    let postcodes: string[] = [];
    if (coverageResults[0].postcode) {
      postcodes.push(coverageResults[0].postcode);
    }

    for (let i = 1; i < coverageResults.length; i++) {
      const result = coverageResults[i];
      const level = this.getSignalLevel(result.coverage?.networks?.[network]);
      const distance = (result.point.distance || 0) / 1000;

      if (level !== currentLevel) {
        // End current segment
        const endDistance = distance;
        segments.push({
          level: currentLevel,
          startDistance,
          endDistance,
          postcodes: [...new Set(postcodes)], // Remove duplicates
          widthPercent: ((endDistance - startDistance) / totalDistance) * 100
        });

        // Start new segment
        currentLevel = level;
        startDistance = distance;
        postcodes = [];
      }

      if (result.postcode && !postcodes.includes(result.postcode)) {
        postcodes.push(result.postcode);
      }
    }

    // Add final segment
    segments.push({
      level: currentLevel,
      startDistance,
      endDistance: totalDistance,
      postcodes: [...new Set(postcodes)],
      widthPercent: ((totalDistance - startDistance) / totalDistance) * 100
    });

    return segments;
  }

  /**
   * Render the coverage visualization as horizontal bars
   * @param coverageResults - Array of coverage results
   */
  render(coverageResults: CoverageResult[]): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container element ${this.containerId} not found`);
    }

    const totalDistanceKm = coverageResults.length > 0
      ? (coverageResults[coverageResults.length - 1].point.distance || 0) / 1000
      : 0;

    // Build HTML for the coverage bars
    let html = `
      <div class="coverage-bars-legend">
        ${[4, 3, 2, 1, 0].map(level => `
          <span class="legend-item">
            <span class="legend-swatch" style="background:${COVERAGE_COLORS[level]}"></span>
            ${COVERAGE_LABELS_SHORT[level]}
          </span>
        `).join('')}
      </div>
      <div class="coverage-bars-container">
    `;

    // Create a bar for each network
    for (const network of NETWORKS) {
      const segments = this.groupIntoSegments(coverageResults, network);

      html += `
        <div class="coverage-bar-row">
          <span class="coverage-bar-label">${network}</span>
          <div class="coverage-bar">
      `;

      for (const segment of segments) {
        const tooltip = this.formatSegmentTooltip(segment);
        html += `
          <div class="coverage-segment"
               style="width: ${segment.widthPercent}%; background: ${COVERAGE_COLORS[segment.level]}"
               title="${tooltip}"
               data-level="${segment.level}">
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    // Add distance axis
    html += `
      </div>
      <div class="coverage-bars-axis">
        <span>0 km</span>
        <span>${(totalDistanceKm * 0.25).toFixed(0)} km</span>
        <span>${(totalDistanceKm * 0.5).toFixed(0)} km</span>
        <span>${(totalDistanceKm * 0.75).toFixed(0)} km</span>
        <span>${totalDistanceKm.toFixed(0)} km</span>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Format tooltip text for a coverage segment
   */
  private formatSegmentTooltip(segment: CoverageSegment): string {
    const distanceRange = `${segment.startDistance.toFixed(1)} - ${segment.endDistance.toFixed(1)} km`;
    const levelDesc = COVERAGE_LEVELS[segment.level] || 'Unknown';
    const postcodeStr = segment.postcodes.length > 0
      ? `Postcodes: ${segment.postcodes.slice(0, 3).join(', ')}${segment.postcodes.length > 3 ? '...' : ''}`
      : '';
    return `${distanceRange}\n${levelDesc}${postcodeStr ? '\n' + postcodeStr : ''}`;
  }

  /**
   * Calculate summary statistics
   * @param coverageResults - Array of coverage results
   * @returns Summary stats per network (cumulative "or better" percentages)
   */
  calculateSummary(coverageResults: CoverageResult[]): Record<string, NetworkSummaryStats> {
    const summary: Record<string, NetworkSummaryStats> = {};

    NETWORKS.forEach(network => {
      const levels = coverageResults.map(result =>
        this.getSignalLevel(result.coverage?.networks?.[network])
      );

      const total = levels.length;
      // Cumulative "or better" counts for each coverage level
      const indoorPlus = levels.filter(l => l >= 4).length;  // Level ≥4: Good outdoor and in-home
      const indoor = levels.filter(l => l >= 3).length;      // Level ≥3: Good outdoor, variable in-home or better
      const outdoor = levels.filter(l => l >= 2).length;     // Level ≥2: Good outdoor or better
      const variable = levels.filter(l => l >= 1).length;    // Level ≥1: Variable outdoor or better
      const poorNone = levels.filter(l => l === 0).length;   // Level =0: Poor to none

      summary[network] = {
        'Indoor+': total > 0 ? Math.round((indoorPlus / total) * 100) : 0,
        'Indoor': total > 0 ? Math.round((indoor / total) * 100) : 0,
        'Outdoor': total > 0 ? Math.round((outdoor / total) * 100) : 0,
        'Variable': total > 0 ? Math.round((variable / total) * 100) : 0,
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
      1: 'Indoor+',
      2: 'Indoor',
      3: 'Outdoor',
      4: 'Variable',
      5: 'Poor/None',
      6: 'Rank'
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
        <td>${stats['Indoor+']}%</td>
        <td>${stats['Indoor']}%</td>
        <td>${stats['Outdoor']}%</td>
        <td>${stats['Variable']}%</td>
        <td>${stats['Poor/None']}%</td>
        <td>${stats['Rank']}</td>
      `;
    });
  }
}
