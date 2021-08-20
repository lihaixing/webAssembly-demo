const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  //开发环境
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
      {
        test: /\.tsx?$/,
        loader: 'assemblyscript-loader-loader',
        include: path.resolve(__dirname, './assemblyscript'),
        exclude: path.resolve(__dirname, './node_modules'),
        options: {
          limit: 1000,
          optimize: true,
          noAssert: true,
          // importMemory: true,
          runtime: 'none',
          // useInWorker: true,
        }
      }
    ]
  },
  devServer: {
    contentBase: './dist',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Output Management',
    }),
  ],
  cache: {
    type: 'filesystem',
    // cacheDirectory 默认路径是 node_modules/.cache/webpack
    cacheDirectory: path.resolve(__dirname, '.temp_cache')
  },
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true,
  }
};