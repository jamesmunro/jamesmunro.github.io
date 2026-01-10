module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "tools/**/*.js": "tools" });

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
