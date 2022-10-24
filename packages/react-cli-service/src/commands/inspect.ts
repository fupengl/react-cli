import webpackChain from 'webpack-chain'
import fs from 'fs-extra'
import { highlight } from 'cli-highlight'

import type { ServicePlugin } from '../types.js'

const inspect: ServicePlugin = (api, options) => {
  api.registerCommand(
    'inspect',
    {
      description: 'inspect internal webpack config',
      usage: 'react-cli-service inspect [options] [...paths]',
      options: {
        '--mode': 'specify env mode (default: development)',
        '--output': 'output configuration to file (default: webpack.config.js)'
      }
    },
    (args) => {
      const config = api.resolveWebpackConfig()

      // @ts-ignore webpack-chain types
      // @see https://github.com/neutrinojs/webpack-chain/blob/main/src/Config.js
      const output = webpackChain.toString(config)
      const content = highlight(output, { language: 'js' })
      if (args.output) {
        fs.outputFileSync(
          api.resolve(
            typeof args.output === 'boolean' ? 'webpack.config.js' : args.output
          ),
          `module.export = ${output}`
        )
      } else {
        console.log(content)
      }
    }
  )
}

inspect.defaultModes = {
  inspect: 'development'
}

export default inspect
