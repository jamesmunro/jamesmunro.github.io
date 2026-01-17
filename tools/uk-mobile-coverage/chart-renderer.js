/**
 * Chart Renderer Module
 * Handles rendering the coverage visualization using Chart.js
 */

class ChartRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
  }

  /**
   * Determine signal level from coverage data
   * @param {Object} networkData - Coverage data for a network {level, color, description}
   * @returns {number} Signal level (0-4 from tile API, or 0 if no data)
   */
  getSignalLevel(networkData) {
    if (!networkData) return 0;
    if (networkData.error) return 0;
    if (typeof networkData.level === 'number') {
      return Math.max(0, Math.min(4, networkData.level)); // Clamp to 0-4
    }
    return 0;
  }

  /**
   * Prepare chart data from coverage results
   * @param {Array} coverageResults - Array of {point, coverage} objects
   * @returns {Object} Chart.js datasets
   */
  prepareChartData(coverageResults) {
    const networks = ['EE', 'Vodafone', 'O2', 'Three'];
    const colors = {
      EE: '#009a9a',
      Vodafone: '#e60000',
      O2: '#0019a5',
      Three: '#333333'
    };

    const datasets = networks.map(network => {
      const data = coverageResults.map(result => ({
        x: result.point.distance / 1000, // Convert to km
        y: this.getSignalLevel(result.coverage?.networks?.[network]),
        postcode: result.postcode || 'Unknown',
        lat: result.point.lat,
        lng: result.point.lng
      }));

      return {
        label: network,
        data: data,
        borderColor: colors[network],
        backgroundColor: colors[network] + '20', // Add transparency
        borderWidth: 2,
        tension: 0,
        stepped: true,
        pointRadius: 0,
        pointHoverRadius: 5
      };
    });

    return datasets;
  }

  /**
   * Render the coverage chart
   * @param {Array} coverageResults - Array of coverage results
   */
  render(coverageResults) {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) {
      throw new Error(`Canvas element ${this.canvasId} not found`);
    }

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const datasets = this.prepareChartData(coverageResults);

    this.chart = new Chart(ctx, {
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
                return value.toFixed(1);
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
                const labels = ['Poor/None', 'Variable', 'Good', 'Good (Var In)', 'Good (In & Out)'];
                return labels[value] || '';
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: function(context) {
                const point = context[0].raw;
                return `Distance: ${point.x.toFixed(2)} km`;
              },
              label: function(context) {
                const labels = ['Poor to none outdoor', 'Variable outdoor', 'Good outdoor', 'Good outdoor, variable in-home', 'Good outdoor and in-home'];
                const levelLabel = labels[context.parsed.y] || 'Unknown';
                return `${context.dataset.label}: ${levelLabel}`;
              },
              afterLabel: function(context) {
                const point = context.raw;
                return `Postcode: ${point.postcode}\nLat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}`;
              }
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  /**
   * Calculate summary statistics
   * @param {Array} coverageResults - Array of coverage results
   * @returns {Object} Summary stats per network
   */
  calculateSummary(coverageResults) {
    const networks = ['EE', 'Vodafone', 'O2', 'Three'];
    const summary = {};

    networks.forEach(network => {
      const levels = coverageResults.map(result =>
        this.getSignalLevel(result.coverage?.networks?.[network])
      );

      const total = levels.length;
      // Count points with good coverage (level 2+) and excellent (level 3+)
      const excellent = levels.filter(l => l >= 3).length;
      const good = levels.filter(l => l >= 2).length;
      const adequate = levels.filter(l => l >= 1).length;

      summary[network] = {
        'Excellent': total > 0 ? Math.round((excellent / total) * 100) : 0,
        'Good': total > 0 ? Math.round((good / total) * 100) : 0,
        'Adequate': total > 0 ? Math.round((adequate / total) * 100) : 0,
        avgLevel: total > 0 ? (levels.reduce((a, b) => a + b, 0) / total) : 0
      };
    });

    return summary;
  }

  /**
   * Render summary table
   * @param {Array} coverageResults - Array of coverage results
   * @param {string} tableBodyId - ID of table body element
   */
  renderSummary(coverageResults, tableBodyId) {
    const summary = this.calculateSummary(coverageResults);
    const tbody = document.getElementById(tableBodyId);

    if (!tbody) {
      throw new Error(`Table body element ${tableBodyId} not found`);
    }

    // Store summary data for sorting
    this.summaryData = summary;
    this.tableBodyId = tableBodyId;
    this.currentSort = { column: 'avgLevel', descending: true };

    // Setup sortable headers
    this.setupSortableHeaders(tbody);

    // Initial render sorted by best coverage
    this.renderSummaryRows(summary, tbody, 'avgLevel', true);
  }

  /**
   * Setup click handlers for sortable column headers
   */
  setupSortableHeaders(tbody) {
    const table = tbody.closest('table');
    if (!table) return;

    const headers = table.querySelectorAll('th');
    const sortableColumns = {
      1: 'Excellent',
      2: 'Good',
      3: 'Adequate'
    };

    headers.forEach((th, index) => {
      if (sortableColumns[index]) {
        th.style.cursor = 'pointer';
        th.title = 'Click to sort';
        th.onclick = () => {
          const column = sortableColumns[index];
          const descending = this.currentSort.column === column ? !this.currentSort.descending : true;
          this.currentSort = { column, descending };
          this.renderSummaryRows(this.summaryData, tbody, column, descending);
          this.updateSortIndicators(headers, index, descending);
        };
      }
    });
  }

  /**
   * Update sort indicators on headers
   */
  updateSortIndicators(headers, activeIndex, descending) {
    headers.forEach((th, index) => {
      // Remove existing indicators
      th.textContent = th.textContent.replace(/ [▲▼]$/, '');
      if (index === activeIndex) {
        th.textContent += descending ? ' ▼' : ' ▲';
      }
    });
  }

  /**
   * Render summary table rows with sorting
   */
  renderSummaryRows(summary, tbody, sortColumn, descending) {
    tbody.innerHTML = '';

    // Find the best network (highest avgLevel)
    const bestNetwork = Object.entries(summary)
      .sort((a, b) => b[1].avgLevel - a[1].avgLevel)[0][0];

    // Sort networks by specified column
    const networksSorted = Object.entries(summary)
      .sort((a, b) => {
        const aVal = a[1][sortColumn];
        const bVal = b[1][sortColumn];
        return descending ? bVal - aVal : aVal - bVal;
      });

    networksSorted.forEach(([network, stats]) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${network}</strong></td>
        <td>${stats['Excellent']}%</td>
        <td>${stats['Good']}%</td>
        <td>${stats['Adequate']}%</td>
        <td>${network === bestNetwork ? '✓ Best' : ''}</td>
      `;
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChartRenderer };
}

// Export to global scope for browser
if (typeof window !== 'undefined') {
  window.ChartRenderer = ChartRenderer;
}
