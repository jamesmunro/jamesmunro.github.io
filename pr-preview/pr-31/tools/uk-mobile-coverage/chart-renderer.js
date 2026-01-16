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
   * @param {Object} networkData - Coverage data for a network {data3G, data4G, data5G}
   * @returns {number} Signal level (0=No Data, 1=3G Data, 2=4G Data, 3=5G Data)
   */
  getSignalLevel(networkData) {
    if (!networkData) return 0;
    if (networkData.data5G) return 3;
    if (networkData.data4G) return 2;
    if (networkData.data3G) return 1;
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
      EE: '#00a0dc',
      Vodafone: '#e60000',
      O2: '#0019a5',
      Three: '#8a00b8'
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
            max: 3,
            title: {
              display: true,
              text: 'Data Coverage Type'
            },
            ticks: {
              stepSize: 1,
              callback: function(value) {
                const labels = ['No Data', '3G Data', '4G Data', '5G Data'];
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
                const labels = ['No Data', '3G Data', '4G Data', '5G Data'];
                const signalLabel = labels[context.parsed.y] || 'Unknown';
                return `${context.dataset.label}: ${signalLabel}`;
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
      const data5G = levels.filter(l => l === 3).length;
      const data4G = levels.filter(l => l >= 2).length;
      const data3G = levels.filter(l => l >= 1).length;

      summary[network] = {
        '5G': total > 0 ? ((data5G / total) * 100).toFixed(1) : '0.0',
        '4G': total > 0 ? ((data4G / total) * 100).toFixed(1) : '0.0',
        '3G+': total > 0 ? ((data3G / total) * 100).toFixed(1) : '0.0',
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

    // Clear existing rows
    tbody.innerHTML = '';

    // Sort networks by average level (best first)
    const networksSorted = Object.entries(summary)
      .sort((a, b) => b[1].avgLevel - a[1].avgLevel);

    networksSorted.forEach(([network, stats], index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${network}</strong></td>
        <td>${stats['5G']}%</td>
        <td>${stats['4G']}%</td>
        <td>${stats['3G+']}%</td>
        <td>${index === 0 ? '✓ Best' : ''}</td>
      `;
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChartRenderer };
}
