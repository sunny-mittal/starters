const path = require('path'),
  fs = require('fs'),

  webpack = require('webpack'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  CleanPlugin = require('clean-webpack-plugin'),

  entryFile = path.join(__dirname, 'src/main.js'),
  devServerPort = 8081

let config = function (env) {
  let returner = {
    entry: entryFile,

    resolve: {
      modules: [path.join(__dirname, 'src'), 'node_modules'],
    },

    output: {
      pathinfo: true,
      devtoolLineToLine: true,
      filename: '[hash].[name].js',
      sourceMapFilename: "[hash].[name].js.map",
      path: path.join(__dirname, 'www')
    },

    module: {
      rules: [

      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/index.html',
        inject: true,
        minify: {
          removeComments: true,
          removeScriptTypeAttributes: true,
          removeAttributeQuotes: true,
          useShortDoctype: true,
          decodeEntities: true,
          collapseWhitespace: true,
          minifyCSS: true
        }
      })
    ]
  }

  if (env) {
    if (typeof env.release !== 'undefined' && env.release) {
      returner.module.rules.push({
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      })
    }
    if (typeof env.devserver !== 'undefined' && env.devserver) {
      returner.entry = [
        entryFile,
        path.resolve(__dirname, "webpack/dev_helpers/CordovaDeviceRouter.js")
      ]
      returner.output.publicPath = "/"
      returner.devtool = "eval"
      returner.devServer = {
        contentBase: path.join(__dirname, "www"),
        port: devServerPort,
        stats: {colors: true},
        watchOptions: {
          aggregateTimeout: 300,
          poll: 1000
        },
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        host: "0.0.0.0"
      }
      returner.plugins.push(new webpack.NamedModulesPlugin())
    }
  }

  return returner
}

module.exports = config
