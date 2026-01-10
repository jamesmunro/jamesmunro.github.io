module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "tools/**/*.js": "tools" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/xterm/css/xterm.css": "assets/libs/xterm/xterm.css",
    "node_modules/xterm/lib/xterm.js": "assets/libs/xterm/xterm.js",
    "node_modules/xterm-addon-fit/lib/xterm-addon-fit.js": "assets/libs/xterm/xterm-addon-fit.js"
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
