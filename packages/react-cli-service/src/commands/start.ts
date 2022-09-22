import webpack from 'webpack'

import type { ServicePlugin } from '../types'

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
      const webpackConfig = api.resolveWebpackConfig()

      console.log('webpackConfig', webpackConfig)

      // create compiler
      const compiler = webpack(webpackConfig)
    }
  )
}

export default start
