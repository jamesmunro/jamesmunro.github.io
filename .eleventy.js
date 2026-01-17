const https = require('https');

module.exports = function (eleventyConfig) {
  // Cache-busting filter for JS files
  eleventyConfig.addFilter("cacheBust", function(url) {
    const version = this.ctx?.build?.version || Date.now().toString(36);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  });

  eleventyConfig.addPassthroughCopy("tools/**/*.js");
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

    // CORS proxy middleware for Ofcom tile API
    middleware: [
      function(req, res, next) {
        // Proxy requests to /api/tiles/* to ofcom.europa.uk.com
        if (req.url.startsWith('/api/tiles/')) {
          const targetPath = req.url.replace('/api/tiles/', '/tiles/');
          const targetUrl = `https://ofcom.europa.uk.com${targetPath}`;

          https.get(targetUrl, (proxyRes) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/png');
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
