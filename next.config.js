module.exports = {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Web Worker configuration
        config.module.rules.push({
          test: /\.worker\.js$/,
          loader: 'worker-loader',
          options: {
            publicPath: '/_next/static/worker/',
            filename: 'static/worker/[hash].worker.js',
          },
        });
  
        // Configuration for .node files
        config.module.rules.push({
          test: /\.node$/,
          loader: 'node-loader',
        });
  
        // Resolve aliases to prevent bundling certain server-side modules in client-side code
        config.resolve.alias = {
          ...config.resolve.alias,
          // Mock sharp module
          "sharp$": false,
          // Mock onnxruntime-node module
          "onnxruntime-node$": false,
        };
      }

      config.resolve.alias.canvas = false
      config.resolve.alias.encoding = false
      
      return config;
    },
  };
  