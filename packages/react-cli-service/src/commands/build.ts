import webpack from 'webpack'

import type { ServicePlugin } from '../types.js'

const build: ServicePlugin = (api, options) => {
  api.registerCommand(
    'build',
    {
      description: 'build for production',
      usage: 'react-cli-service build [options] [entry|pattern]',
      options: {
        '--mode': `specify env mode (default: production)`
      }
    },
    async (args) => {
      process.env.BABEL_ENV = 'production'
      process.env.NODE_ENV = 'production'

      const webpackConfig = api.resolveWebpackConfig()

      // create compiler
      const compiler = webpack(webpackConfig)
      console.log('Creating an optimized production build...')

      await new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          console.log(err, stats?.hasErrors())
          console.log(stats?.toJson()?.errors)
          if (err) {
            console.log(err)
            if (!err.message) {
              return reject(err)
            }
          }
        })
      })
    }
  )
}

export default build
