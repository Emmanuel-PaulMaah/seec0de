const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv && argv.mode === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    entry: './src/renderer/index.jsx',
    target: 'web',
    devtool: isProd ? false : 'source-map',
    devServer: {
      port: 9000,
      hot: true,
      static: path.join(__dirname, 'public'),
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'renderer.js',
      // production: relative path so Electron's file:// loader resolves assets correctly.
      // development: '/' so webpack-dev-server serves index.html and bundles at the root URL.
      publicPath: isProd ? './' : '/',
    },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        // Self-hosted webfonts (Inter Variable, JetBrains Mono, etc.)
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
      }),
    ],
  };
};
