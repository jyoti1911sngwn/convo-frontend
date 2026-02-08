const webpack = require("webpack");
const path = require("path"); // ← add this at top

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: require.resolve("path-browserify"),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    zlib: require.resolve("browserify-zlib"),
    querystring: require.resolve("querystring-es3"),
    buffer: require.resolve("buffer/"),
    net: false,
    tls: false,
    async_hooks: false,
    assert: require.resolve("assert/"),
    vm: require.resolve("vm-browserify"),
  };

  // node: prefix strip (keep this)
  config.plugins = [
    ...(config.plugins || []),
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, "");
    }),
  ];

  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    })
  );

  // Stronger alias to completely empty out express & related server modules
  // Use path.resolve to make it bulletproof
  config.resolve.alias = {
    ...config.resolve.alias,
    express$: path.resolve(__dirname, "src/shims/empty.js"),
    "express/lib/response": path.resolve(__dirname, "src/shims/empty.js"),
    "express/lib/application": path.resolve(__dirname, "src/shims/empty.js"),
    "express/lib/view": path.resolve(__dirname, "src/shims/empty.js"),
    "body-parser": path.resolve(__dirname, "src/shims/empty.js"),
    send: path.resolve(__dirname, "src/shims/empty.js"),
  };

  return config;
};