/**
 * Webpack Bundle Analyzer Configuration for KitchenXpert
 *
 * Purpose:
 * - Analyze bundle size and composition
 * - Identify large dependencies
 * - Visualize module tree
 * - Detect optimization opportunities
 *
 * Usage:
 * - npm run build:analyze
 * - Opens interactive treemap in browser
 * - Generates stats.json for further analysis
 *
 * @see https://github.com/webpack-contrib/webpack-bundle-analyzer
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { merge } = require('webpack-merge');
const prodConfig = require('./webpack.prod');

module.exports = merge(prodConfig, {
  plugins: [
    // Bundle Analyzer Plugin
    new BundleAnalyzerPlugin({
      // ============================================================
      // Analysis Mode
      // ============================================================

      /**
       * Analysis mode
       * - 'server': Start HTTP server with report
       * - 'static': Generate HTML report file
       * - 'json': Generate stats JSON
       * - 'disabled': Just generate stats
       */
      analyzerMode: 'server',

      /**
       * Host for analyzer server
       */
      analyzerHost: 'localhost',

      /**
       * Port for analyzer server
       */
      analyzerPort: 8888,

      /**
       * Automatically open report in browser
       */
      openAnalyzer: true,

      // ============================================================
      // Report Generation
      // ============================================================

      /**
       * Path to generated report HTML
       */
      reportFilename: '../../reports/bundle-analysis.html',

      /**
       * Report title
       */
      reportTitle: 'KitchenXpert Bundle Analysis',

      /**
       * Default module sizes to show
       * - 'stat': Original size before transforms
       * - 'parsed': Size after transforms
       * - 'gzip': Gzipped size
       */
      defaultSizes: 'gzip',

      // ============================================================
      // Stats Configuration
      // ============================================================

      /**
       * Generate stats.json file
       */
      generateStatsFile: true,

      /**
       * Path to stats.json
       */
      statsFilename: '../../reports/stats.json',

      /**
       * Stats options
       */
      statsOptions: {
        source: false,
        reasons: true,
        errorDetails: true,
        chunkModules: true,
        chunks: true,
        modules: true,
        assets: true,
        children: false,
        warnings: true,
        errors: true,
        performance: true,
        timings: true,
        hash: true,
        version: true,
        publicPath: true,
        outputPath: true,
      },

      // ============================================================
      // Display Options
      // ============================================================

      /**
       * Exclude modules from report
       */
      excludeAssets: [
        /\.map$/,          // Source maps
        /LICENSE$/,        // License files
        /\.txt$/,          // Text files
      ],

      /**
       * Log level
       * - 'info': Log everything
       * - 'warn': Only warnings and errors
       * - 'error': Only errors
       * - 'silent': No output
       */
      logLevel: 'info',
    }),
  ],

  // ============================================================
  // Additional Configuration
  // ============================================================

  /**
   * Performance hints for bundle size
   */
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,  // 500 KB
    maxAssetSize: 512000,       // 500 KB

    /**
     * Filter which assets to check
     */
    assetFilter: (assetFilename) => {
      // Only check JS files
      return /\.js$/.test(assetFilename);
    },
  },

  /**
   * Stats output for console
   */
  stats: {
    colors: true,
    modules: true,
    chunks: true,
    chunkModules: true,
    reasons: true,
    errorDetails: true,
    assets: true,
    children: false,
  },
});

/**
 * ============================================================
 * Usage Examples
 * ============================================================
 *
 * package.json scripts:
 * {
 *   "scripts": {
 *     "build:analyze": "webpack --config config/webpack/webpack.analyze.js",
 *     "analyze:stats": "webpack-bundle-analyzer reports/stats.json dist -p 8889"
 *   }
 * }
 *
 * Analysis Tips:
 *
 * 1. Identify Large Dependencies:
 *    - Look for libraries that take up significant space
 *    - Consider lighter alternatives (e.g., date-fns vs moment.js)
 *    - Check if you're importing entire libraries when you only need parts
 *
 * 2. Check for Duplicates:
 *    - Same library imported multiple times
 *    - Different versions of same library
 *    - Use webpack-bundle-analyzer to spot these
 *
 * 3. Code Splitting Opportunities:
 *    - Large components that aren't needed on initial load
 *    - Route-based splitting
 *    - Lazy load heavy features
 *
 * 4. Tree Shaking:
 *    - Ensure modules are ES6 format
 *    - Check for unused exports
 *    - Verify sideEffects in package.json
 *
 * 5. Compression:
 *    - Compare gzip vs brotli sizes
 *    - Enable compression in production
 *    - Consider pre-compressing assets
 */

/**
 * ============================================================
 * Common Issues and Solutions
 * ============================================================
 *
 * Issue: Bundle too large
 * Solutions:
 * - Code splitting (dynamic imports)
 * - Lazy loading routes
 * - Tree shaking optimization
 * - Replace heavy dependencies
 * - Use CDN for large libraries
 *
 * Issue: Duplicate dependencies
 * Solutions:
 * - Use webpack.optimize.ModuleConcatenationPlugin
 * - Check for multiple versions in package-lock.json
 * - Use npm dedupe or yarn deduplicate
 *
 * Issue: Unused code in bundle
 * Solutions:
 * - Enable tree shaking (mode: 'production')
 * - Use sideEffects: false in package.json
 * - Import specific functions instead of entire modules
 * - Use babel-plugin-transform-imports
 *
 * Issue: Large CSS bundle
 * Solutions:
 * - Use PurgeCSS to remove unused styles
 * - Split CSS by route
 * - Use CSS modules for better tree shaking
 * - Consider CSS-in-JS for critical CSS
 */

// TODO: Add custom metrics for bundle analysis
// TODO: Add automated bundle size regression testing
// TODO: Integrate with CI/CD for bundle size tracking
// TODO: Add comparison with previous builds
// TODO: Create dashboard for bundle size trends over time
