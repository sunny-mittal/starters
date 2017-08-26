module.exports = {
  entry: [
    './src/index.js'
  ],
  output: {
    path: __dirname,
    publicPath: '/',
    filename: 'bundle.js'
  },
  module: {
    loaders: [ {
      exclude: /node_modules/,
      loader: 'babel',
      query: {
        presets: [ 'react', 'env' ]
      }
    } ]
  },
  resolve: {
    extensions: [ '', '.js', '.jsx' ]
  },
  devServer: {
    historyApiFallback: true,
    contentBase: './'
  }
}
