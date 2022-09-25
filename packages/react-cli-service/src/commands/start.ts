import webpack from 'webpack'

import type { ServicePlugin } from '../types.js'

const start: ServicePlugin = (api, options) => {
  api.registerCommand(
    'start',
    {
      description: 'start development server',
      usage: 'react-cli-service serve [options] [entry]',
      options: {
        '--mode': `specify env mode (default: development)`,
        '--open': `open browser on server start`
      }
    },
    (args) => {
      process.env.BABEL_ENV = 'development'
      process.env.NODE_ENV = 'development'

      const webpackConfig = api.resolveWebpackConfig()

      // create compiler
      const compiler = webpack(webpackConfig)

      compiler.watch({}, (err) => {
        console.log(err)
      })
    }
  )
}

export default start
