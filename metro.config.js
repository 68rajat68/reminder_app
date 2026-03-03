const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite web support: register .wasm as an asset extension
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer requires Cross-Origin isolation headers
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;
