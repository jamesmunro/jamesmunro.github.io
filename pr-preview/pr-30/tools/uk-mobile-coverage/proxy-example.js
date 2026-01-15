/**
 * Example Cloudflare Workers Proxy for Ofcom API
 *
 * This proxy adds CORS headers to enable client-side access to the Ofcom API.
 *
 * Setup Instructions:
 * 1. Sign up for Cloudflare Workers: https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Copy this code into the Worker editor
 * 4. Replace 'YOUR_OFCOM_API_KEY_HERE' with your actual Ofcom API key
 * 5. Deploy the Worker
 * 6. Use the Worker URL as the proxy URL in the coverage tool
 *
 * Example Worker URL: https://your-worker-name.your-subdomain.workers.dev
 */

export default {
  async fetch(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const url = new URL(request.url);
    const postcode = url.searchParams.get('postcode');

    // Validate postcode parameter
    if (!postcode) {
      return new Response(JSON.stringify({
        error: 'Missing postcode parameter',
        usage: 'Add ?postcode=SW1A1AA to the URL'
      }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate postcode format (basic check)
    const postcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodePattern.test(postcode)) {
      return new Response(JSON.stringify({
        error: 'Invalid postcode format',
        postcode: postcode,
        expected: 'UK postcode format (e.g., SW1A 1AA)'
      }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch from Ofcom API
    const ofcomUrl = `https://api.ofcom.org.uk/mobile-coverage/v1/coverage?postcode=${encodeURIComponent(postcode)}`;

    try {
      const response = await fetch(ofcomUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': 'YOUR_OFCOM_API_KEY_HERE'
        }
      });

      // Get response data
      const data = await response.json();

      // Return with CORS headers
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });

    } catch (error) {
      // Handle errors
      return new Response(JSON.stringify({
        error: 'Failed to fetch coverage data',
        message: error.message,
        postcode: postcode
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }
  }
};
