/**
 * Reusable Webpack Configuration Parts for KitchenXpert
 *
 * Purpose:
 * - Modular webpack configuration components
 * - Reusable loaders and plugins
 * - Environment-specific configurations
 * - Code splitting and optimization strategies
 *
 * Usage:
 * - Import parts: const { devServer, loadCSS } = require('./webpack.parts');
 * - Merge in config: merge(commonConfig, devServer(), loadCSS());
 *
 * @see https://webpack.js.org/configuration/
 */

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');

// ============================================================
// Development Server
// ============================================================

/**
 * Development server configuration
 */
exports.devServer = ({ host = 'localhost', port = 3000 } = {}) => ({
  devServer: {
    host,
    port,
    hot: true,
    open: true,
    historyApiFallback: true,
    compress: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    static: {
      directory: './public',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

// ============================================================
// CSS Loaders
// ============================================================

/**
 * Load CSS files
 */
exports.loadCSS = ({ include, exclude } = {}) => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        include,
        exclude,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          },
          'postcss-loader',
        ],
      },
    ],
  },
});

/**
 * Extract CSS to separate files (production)
 */
exports.extractCSS = ({ include, exclude } = {}) => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        include,
        exclude,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[id].[contenthash:8].css',
    }),
  ],
});

/**
 * Load SCSS files
 */
exports.loadSCSS = ({ include, exclude } = {}) => ({
  module: {
    rules: [
      {
        test: /\.scss$/,
        include,
        exclude,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: true,
            },
          },
          'postcss-loader',
          'sass-loader',
        ],
      },
    ],
  },
});

/**
 * Load CSS Modules
 */
exports.loadCSSModules = ({ include, exclude } = {}) => ({
  module: {
    rules: [
      {
        test: /\.module\.css$/,
        include,
        exclude,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
              importLoaders: 1,
              sourceMap: true,
            },
          },
          'postcss-loader',
        ],
      },
    ],
  },
});

// ============================================================
// Image Optimization
// ============================================================

/**
 * Optimize images
 */
exports.optimizeImages = () => ({
  module: {
    rules: [
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },
    ],
  },
  plugins: [
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [
            ['gifsicle', { interlaced: true }],
            ['jpegtran', { progressive: true }],
            ['optipng', { optimizationLevel: 5 }],
            [
              'svgo',
              {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                        addAttributesToSVGElement: {
                          params: {
                            attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          ],
        },
      },
    }),
  ],
});

// ============================================================
// Code Splitting
// ============================================================

/**
 * Split vendor bundles
 */
exports.splitChunks = () => ({
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          name: 'vendor-react',
          priority: 20,
        },
        // UI libraries
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
          name: 'vendor-ui',
          priority: 15,
        },
        // Three.js and 3D libraries
        three: {
          test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
          name: 'vendor-three',
          priority: 15,
        },
        // Utilities
        utilities: {
          test: /[\\/]node_modules[\\/](lodash|date-fns|axios)[\\/]/,
          name: 'vendor-utils',
          priority: 10,
        },
        // Common vendor code
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5,
        },
        // Common code
        common: {
          minChunks: 2,
          name: 'common',
          priority: 1,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
  },
});

// ============================================================
// Source Maps
// ============================================================

/**
 * Generate source maps for development
 */
exports.generateSourceMaps = ({ type = 'eval-source-map' } = {}) => ({
  devtool: type,
});

/**
 * Generate source maps for production
 */
exports.generateProductionSourceMaps = () => ({
  devtool: 'source-map',
});

// ============================================================
// Compression
// ============================================================

/**
 * Gzip compression
 */
exports.compressGzip = () => ({
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10KB
      minRatio: 0.8,
      deleteOriginalAssets: false,
    }),
  ],
});

/**
 * Brotli compression
 */
exports.compressBrotli = () => ({
  plugins: [
    new BrotliPlugin({
      asset: '[path].br[query]',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ],
});

// ============================================================
// Performance
// ============================================================

/**
 * Performance hints
 */
exports.setPerformanceHints = ({ maxEntrypointSize = 512000, maxAssetSize = 512000 } = {}) => ({
  performance: {
    hints: 'warning',
    maxEntrypointSize,
    maxAssetSize,
  },
});

/**
 * Disable performance hints
 */
exports.disablePerformanceHints = () => ({
  performance: {
    hints: false,
  },
});

// ============================================================
// Clean Build Directory
// ============================================================

/**
 * Clean output directory before build
 */
exports.cleanBuild = () => ({
  output: {
    clean: true,
  },
});

// ============================================================
// Module Federation (Micro-frontends)
// ============================================================

/**
 * Configure module federation
 */
exports.moduleFederation = ({ name, filename, exposes = {}, remotes = {}, shared = {} } = {}) => {
  const { ModuleFederationPlugin } = require('webpack').container;

  return {
    plugins: [
      new ModuleFederationPlugin({
        name,
        filename,
        exposes,
        remotes,
        shared: {
          react: { singleton: true, requiredVersion: '^18.0.0' },
          'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
          ...shared,
        },
      }),
    ],
  };
};

// ============================================================
// Asset Modules
// ============================================================

/**
 * Load fonts
 */
exports.loadFonts = () => ({
  module: {
    rules: [
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },
});

/**
 * Load media files
 */
exports.loadMedia = () => ({
  module: {
    rules: [
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[hash:8][ext]',
        },
      },
    ],
  },
});

// ============================================================
// Environment Variables
// ============================================================

/**
 * Define environment variables
 */
exports.defineEnvVariables = (env) => {
  const { DefinePlugin } = require('webpack');

  return {
    plugins: [
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
        'process.env.API_URL': JSON.stringify(env.API_URL || 'http://localhost:3001'),
        'process.env.APP_VERSION': JSON.stringify(env.APP_VERSION || '1.0.0'),
      }),
    ],
  };
};

// ============================================================
// Progressive Web App
// ============================================================

/**
 * Generate service worker for PWA
 */
exports.generateServiceWorker = () => {
  const { GenerateSW } = require('workbox-webpack-plugin');

  return {
    plugins: [
      new GenerateSW({
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.kitchenxpert\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      }),
    ],
  };
};

// TODO: Add lazy loading configuration parts
// TODO: Add CSS purging for production
// TODO: Add critical CSS extraction
// TODO: Add preload/prefetch configuration
// TODO: Add bundle size monitoring integration
