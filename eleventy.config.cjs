module.exports = function(eleventyConfig) {
  // Passthrough copy for JS files in tools
  eleventyConfig.addPassthroughCopy("tools/**/*.js");

  // Global Data
  eleventyConfig.addGlobalData("site", {
    title: "jamesmunro.github.io"
  });

  // Jekyll filters
  eleventyConfig.addFilter("relative_url", url => url);

  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "_layouts"
    }
  };
};
