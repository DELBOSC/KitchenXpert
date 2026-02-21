const { merge } = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',

  devtool: 'eval-source-map',

  output: {
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].chunk.js',
  },

  devServer: {
    port: 3000,
    hot: true,
    open: true,
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
    static: {
      directory: path.join(__dirname, '../../packages/frontend/public'),
      publicPath: '/',
    },
  },

  plugins: [
    // Hot Module Replacement
    new webpack.HotModuleReplacementPlugin(),

    // React Fast Refresh
    new ReactRefreshWebpackPlugin({
      overlay: false,
    }),

    // Environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:4000'),
    }),
  ],

  optimization: {
    runtimeChunk: 'single',
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },

  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '../../node_modules/.cache/webpack'),
  },

  stats: 'minimal',
});
