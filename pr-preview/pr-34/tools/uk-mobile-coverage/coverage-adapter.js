/**
 * Coverage Data Adapter
 * Fetches mobile coverage data from Ofcom API
 */

class CoverageAdapter {
  constructor() {
    // No configuration needed - uses Ofcom API directly
  }

  /**
   * Get coverage data for a postcode
   * @param {string} postcode - UK postcode
   * @returns {Promise<Object>} Coverage data with networks (EE, Vodafone, O2, Three)
   */
  async getCoverage(postcode) {
    const url = `https://api.ofcom.org.uk/mobile/coverage?postcode=${encodeURIComponent(postcode)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Ofcom API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Ofcom response to our format (data coverage only)
      return this.transformOfcomData(data, postcode);
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Failed to connect to Ofcom API. Please check your internet connection.');
      }
      throw new Error(`Failed to fetch coverage from Ofcom: ${error.message}`);
    }
  }

  /**
   * Transform Ofcom API response to our format
   */
  transformOfcomData(ofcomData, postcode) {
    // Ofcom API returns availability data per operator
    // Map their response to our simplified format
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
