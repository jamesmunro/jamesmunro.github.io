/**
 * Coverage Data Adapter
 * Fetches mobile coverage data from Ofcom API
 *
 * Ofcom API docs: https://api.ofcom.org.uk/
 * Endpoint: https://api-proxy.ofcom.org.uk/mobile/coverage/{PostCode}
 *
 * Response fields use these provider codes:
 *   - EE = EE
 *   - VO = Vodafone
 *   - TF = O2 (Telefonica)
 *   - H3 = Three
 *
 * Coverage ratings (0-4):
 *   0 = No coverage
 *   1 = Limited coverage (may be outside only)
 *   2 = Coverage likely outdoors
 *   3 = Coverage likely indoors
 *   4 = Enhanced coverage indoors
 */

class CoverageAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Get coverage data for a postcode
   * @param {string} postcode - UK postcode
   * @returns {Promise<Object>} Coverage data with networks (EE, Vodafone, O2, Three)
   */
  async getCoverage(postcode) {
    // Ofcom API requires postcode without spaces, uppercase
    const normalizedPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    const url = `https://api-proxy.ofcom.org.uk/mobile/coverage/${normalizedPostcode}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Ofcom API key');
        }
        if (response.status === 404) {
          throw new Error(`Postcode not found in Ofcom database: ${postcode}`);
        }
        throw new Error(`Ofcom API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Ofcom response to our format (data coverage only)
      return this.transformOfcomData(data, postcode);
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Failed to connect to Ofcom API. Please check your internet connection.');
      }
      if (error.message.includes('Invalid Ofcom API key') ||
          error.message.includes('Postcode not found')) {
        throw error;
      }
      throw new Error(`Failed to fetch coverage from Ofcom: ${error.message}`);
    }
  }

  /**
   * Convert Ofcom rating (0-4) to our coverage level
   * @param {number} rating - Ofcom rating (0-4)
   * @returns {Object} Coverage object with data3G, data4G, data5G booleans
   */
  ratingToCoverage(rating) {
    // Ofcom rating 0-4 indicates coverage quality, not technology
    // Rating >= 2 means usable outdoor coverage
    // We'll map this to data availability (treating as 4G since Ofcom doesn't distinguish 3G/4G/5G in ratings)
    return {
      data3G: rating >= 1,  // Any coverage at all
      data4G: rating >= 2,  // Outdoor or better
      data5G: false         // Ofcom doesn't provide 5G-specific data in basic ratings
    };
  }

  /**
   * Transform Ofcom API response to our format
   * Ofcom returns array of addresses, we use the first one's outdoor data coverage
   */
  transformOfcomData(ofcomData, postcode) {
    // Response is an array of addresses at the postcode
    // Use the first address (or average could be computed)
    const firstAddress = Array.isArray(ofcomData) && ofcomData.length > 0
      ? ofcomData[0]
      : ofcomData;

    if (!firstAddress) {
      return {
        postcode: postcode,
        networks: {
          EE: { data3G: false, data4G: false, data5G: false },
          Vodafone: { data3G: false, data4G: false, data5G: false },
          O2: { data3G: false, data4G: false, data5G: false },
          Three: { data3G: false, data4G: false, data5G: false }
        }
      };
    }

    // Map Ofcom field names to our network names
    // Using DataOutdoor fields (not No4G variants, as we want 4G included)
    return {
      postcode: postcode,
      networks: {
        EE: this.ratingToCoverage(firstAddress.EEDataOutdoor || 0),
        Vodafone: this.ratingToCoverage(firstAddress.VODataOutdoor || 0),
        O2: this.ratingToCoverage(firstAddress.TFDataOutdoor || 0),
        Three: this.ratingToCoverage(firstAddress.H3DataOutdoor || 0)
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CoverageAdapter };
}
