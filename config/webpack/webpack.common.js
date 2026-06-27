const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const paths = {
  root: path.resolve(__dirname, '../..'),
  src: path.resolve(__dirname, '../../packages/frontend/src'),
  build: path.resolve(__dirname, '../../packages/frontend/dist'),
  public: path.resolve(__dirname, '../../packages/frontend/public'),
  nodeModules: path.resolve(__dirname, '../../node_modules'),
};

module.exports = {
  entry: {
    main: path.join(paths.src, 'index.tsx'),
  },

  output: {
    path: paths.build,
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    publicPath: '/',
    clean: true,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': paths.src,
      '@components': path.join(paths.src, 'components'),
      '@pages': path.join(paths.src, 'pages'),
      '@hooks': path.join(paths.src, 'hooks'),
      '@utils': path.join(paths.src, 'utils'),
      '@services': path.join(paths.src, 'services'),
      '@store': path.join(paths.src, 'store'),
      '@types': path.join(paths.src, 'types'),
      '@assets': path.join(paths.src, 'assets'),
      '@styles': path.join(paths.src, 'styles'),
      '@config': path.join(paths.src, 'config'),
      '@3d': path.resolve(__dirname, '../../packages/3d-engine/src'),
      '@common': path.resolve(__dirname, '../../packages/common/src'),
    },
    modules: [paths.nodeModules, 'node_modules'],
  },

  module: {
    rules: [
      // TypeScript & JavaScript
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false,
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: false,
                    useBuiltIns: 'usage',
                    corejs: 3,
                  },
                ],
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                  },
                ],
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-object-rest-spread',
                '@babel/plugin-transform-runtime',
              ],
            },
          },
        ],
      },

      // CSS & SCSS
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: ['autoprefixer', 'postcss-preset-env'],
              },
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: ['autoprefixer', 'postcss-preset-env'],
              },
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },

      // Images
      {
        test: /\.(png|jpe?g|gif|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, // 10kb
          },
        },
        generator: {
          filename: 'images/[name].[contenthash:8][ext]',
        },
      },

      // SVG
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash:8][ext]',
        },
      },

      // Videos
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[contenthash:8][ext]',
        },
      },

      // GLSL Shaders (for 3D engine)
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        type: 'asset/source',
        use: ['glslify-loader'],
      },

      // 3D Models
      {
        test: /\.(gltf|glb|obj|fbx)$/,
        type: 'asset/resource',
        generator: {
          filename: 'models/[name].[contenthash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    // Clean build directory
    new CleanWebpackPlugin(),

    // HTML template
    new HtmlWebpackPlugin({
      template: path.join(paths.public, 'index.html'),
      favicon: path.join(paths.public, 'favicon.ico'),
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),

    // Extract CSS into separate files
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),

    // Copy public assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: paths.public,
          to: paths.build,
          globOptions: {
            ignore: ['**/index.html', '**/favicon.ico'],
          },
        },
      ],
    }),

    // TypeScript type checking in separate process
    new ForkTsCheckerWebpackPlugin({
      async: true,
      typescript: {
        configFile: path.join(paths.root, 'tsconfig.json'),
        mode: 'write-references',
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
      eslint: {
        files: './packages/frontend/src/**/*.{ts,tsx,js,jsx}',
      },
    }),

    // ESLint
    new ESLintPlugin({
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      context: paths.src,
      cache: true,
      cacheLocation: path.join(paths.nodeModules, '.cache/.eslintcache'),
      failOnError: false,
      failOnWarning: false,
    }),
  ],

  // Performance hints
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },

  // Stats
  stats: {
    preset: 'minimal',
    moduleTrace: true,
    errorDetails: true,
  },
};
