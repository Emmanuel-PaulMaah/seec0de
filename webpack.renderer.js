const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv && argv.mode === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    entry: './src/renderer/index.tsx',
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
      publicPath: isProd ? './' : '/',
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.ttf$/,
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
