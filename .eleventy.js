const https = require('https');
const fs = require('fs');
const path = require('path');

// Tile cache directory for dev server
const TILE_CACHE_DIR = path.join(__dirname, '.tile-cache');

module.exports = function (eleventyConfig) {
  // Cache-busting filter for JS files
  eleventyConfig.addFilter("cacheBust", function(url) {
    const version = this.ctx?.build?.version || Date.now().toString(36);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  });

  eleventyConfig.addPassthroughCopy("tools/**/*.js");
  eleventyConfig.addPassthroughCopy("tools/**/*.mjs");
  eleventyConfig.addPassthroughCopy({
    "node_modules/xterm/css/xterm.css": "assets/libs/xterm/xterm.css",
    "node_modules/xterm/lib/xterm.js": "assets/libs/xterm/xterm.js",
    "node_modules/xterm-addon-fit/lib/xterm-addon-fit.js": "assets/libs/xterm/xterm-addon-fit.js",
    "node_modules/pyodide": "assets/libs/pyodide",
    "node_modules/chart.js/dist/chart.umd.js": "assets/libs/chart.js/chart.min.js"
  });

  eleventyConfig.setServerOptions({
    // Default values are shown:

    // Whether the server should reload locally or sync with connected devices
    module: "@11ty/eleventy-dev-server",

    // Show the dev server version number on the command line
    showVersion: true,

    // Change the default port
    // port: 8080,

    // Access the server locally or from the network
    host: "0.0.0.0",

    // CORS proxy middleware for Ofcom tile API with file-based caching
    middleware: [
      function(req, res, next) {
        // Proxy requests to /api/tiles/* to ofcom.europa.uk.com
        if (req.url.startsWith('/api/tiles/')) {
          const targetPath = req.url.replace('/api/tiles/', '/tiles/');
          const targetUrl = `https://ofcom.europa.uk.com${targetPath}`;

          // Create cache key from URL path (sanitize for filesystem)
          const cacheKey = targetPath.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const cachePath = path.join(TILE_CACHE_DIR, cacheKey);

          // Check if cached file exists
          if (fs.existsSync(cachePath)) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('X-Cache', 'HIT');
            fs.createReadStream(cachePath).pipe(res);
            return;
          }

          // Ensure cache directory exists
          if (!fs.existsSync(TILE_CACHE_DIR)) {
            fs.mkdirSync(TILE_CACHE_DIR, { recursive: true });
          }

          // Fetch from upstream and cache
          https.get(targetUrl, (proxyRes) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/png');
            res.setHeader('X-Cache', 'MISS');

            // Write to cache file while streaming to response
            const cacheStream = fs.createWriteStream(cachePath);
            proxyRes.pipe(cacheStream);
            proxyRes.pipe(res);
          }).on('error', (err) => {
            console.error('Proxy error:', err);
            res.statusCode = 502;
            res.end('Proxy error');
          });
          return;
        }
        next();
      }
    ]
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
