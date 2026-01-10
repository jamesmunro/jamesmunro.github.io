module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("tools/**/*.js");
  eleventyConfig.addPassthroughCopy({
    "node_modules/xterm/css/xterm.css": "assets/libs/xterm/xterm.css",
    "node_modules/xterm/lib/xterm.js": "assets/libs/xterm/xterm.js",
    "node_modules/xterm-addon-fit/lib/xterm-addon-fit.js": "assets/libs/xterm/xterm-addon-fit.js",
    "node_modules/pyodide": "assets/libs/pyodide"
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
