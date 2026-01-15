/**
 * Coverage Data Adapter
 * Handles fetching mobile coverage data from different sources
 */

class CoverageAdapter {
  constructor(dataSource, options = {}) {
    this.dataSource = dataSource;
    this.proxyUrl = options.proxyUrl || '';
    this.ofcomApiKey = options.ofcomApiKey || '';
    this.demoData = null;
  }

  /**
   * Load demo data
   */
  async loadDemoData() {
    if (this.demoData) return;

    try {
      const response = await fetch('demo-data.json');
      if (!response.ok) {
        throw new Error('Failed to load demo data');
      }
      this.demoData = await response.json();
    } catch (error) {
      console.error('Error loading demo data:', error);
      throw new Error('Failed to load demo data file');
    }
  }

  /**
   * Get coverage data for a postcode
   * @param {string} postcode - UK postcode
   * @returns {Promise<Object>} Coverage data with networks (EE, Vodafone, O2, Three)
   */
  async getCoverage(postcode) {
    switch(this.dataSource) {
      case 'demo':
        return await this.getCoverageDemo(postcode);
      case 'proxy':
        return await this.getCoverageProxy(postcode);
      case 'ofcom-direct':
        return await this.getCoverageOfcomDirect(postcode);
      default:
        throw new Error(`Unknown data source: ${this.dataSource}`);
    }
  }

  /**
   * Get coverage from demo data
   */
  async getCoverageDemo(postcode) {
    if (!this.demoData) {
      await this.loadDemoData();
    }

    const normalized = postcode.toUpperCase().trim();

    if (this.demoData[normalized]) {
      return this.demoData[normalized];
    }

    // For demo mode, generate realistic mock data for unknown postcodes
    return this.generateMockCoverage(normalized);
  }

  /**
   * Generate mock coverage data for a postcode
   */
  generateMockCoverage(postcode) {
    // Use postcode characters to seed pseudo-random but consistent results
    const seed = postcode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min, max) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    return {
      postcode: postcode,
      networks: {
        EE: {
          data3G: true,
          data4G: random(0, 10) > 1, // 90% chance
          data5G: random(0, 10) > 4  // 60% chance
        },
        Vodafone: {
          data3G: true,
          data4G: random(0, 10) > 2, // 80% chance
          data5G: random(0, 10) > 5  // 50% chance
        },
        O2: {
          data3G: true,
          data4G: random(0, 10) > 2, // 80% chance
          data5G: random(0, 10) > 6  // 40% chance
        },
        Three: {
          data3G: random(0, 10) > 1, // 90% chance
          data4G: random(0, 10) > 3, // 70% chance
          data5G: random(0, 10) > 7  // 30% chance
        }
      }
    };
  }

  /**
   * Get coverage from custom proxy
   */
  async getCoverageProxy(postcode) {
    if (!this.proxyUrl) {
      throw new Error('Proxy URL not configured');
    }

    const url = `${this.proxyUrl}?postcode=${encodeURIComponent(postcode)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch coverage from proxy: ${error.message}`);
    }
  }

  /**
   * Get coverage directly from Ofcom API
   * Note: May fail due to CORS restrictions
   */
  async getCoverageOfcomDirect(postcode) {
    if (!this.ofcomApiKey) {
      throw new Error('Ofcom API key not configured');
    }

    const url = `https://api.ofcom.org.uk/mobile-coverage/v1/coverage?postcode=${encodeURIComponent(postcode)}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.ofcomApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Ofcom API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Ofcom response to our format (data coverage only)
      return this.transformOfcomData(data, postcode);
    } catch (error) {
      if (error.message.includes('CORS')) {
        throw new Error('Direct Ofcom API access blocked by CORS. Please use demo mode or set up a proxy.');
      }
      throw new Error(`Failed to fetch coverage from Ofcom: ${error.message}`);
    }
  }

  /**
   * Transform Ofcom API response to our format
   */
  transformOfcomData(ofcomData, postcode) {
    // This is a placeholder - actual Ofcom API structure may differ
    // Adapt based on real API response
    return {
      postcode: postcode,
      networks: {
        EE: {
          data3G: ofcomData.EE?.data3G || false,
          data4G: ofcomData.EE?.data4G || false,
          data5G: ofcomData.EE?.data5G || false
        },
        Vodafone: {
          data3G: ofcomData.Vodafone?.data3G || false,
          data4G: ofcomData.Vodafone?.data4G || false,
          data5G: ofcomData.Vodafone?.data5G || false
        },
        O2: {
          data3G: ofcomData.O2?.data3G || false,
          data4G: ofcomData.O2?.data4G || false,
          data5G: ofcomData.O2?.data5G || false
        },
        Three: {
          data3G: ofcomData.Three?.data3G || false,
          data4G: ofcomData.Three?.data4G || false,
          data5G: ofcomData.Three?.data5G || false
        }
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CoverageAdapter };
}
