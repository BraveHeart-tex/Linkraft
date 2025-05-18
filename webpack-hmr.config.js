/* eslint-disable @typescript-eslint/no-require-imports */
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options) {
  return {
    ...options,
    entry: ['webpack/hot/poll?1000', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?1000'],
      }),
    ],
    watchOptions: {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: /node_modules|\.git|dist/,
    },
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new RunScriptWebpackPlugin({
        name: options.output.filename,
        autoRestart: false,
      }),
    ],
  };
};
