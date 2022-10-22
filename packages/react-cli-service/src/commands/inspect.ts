import webpackChain from 'webpack-chain'
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
        '--rule <ruleName>': 'inspect a specific module rule',
        '--plugin <pluginName>': 'inspect a specific plugin',
        '--rules': 'list all module rule names',
        '--plugins': 'list all plugin names',
      }
    },
    (args) => {
      const config = api.resolveWebpackConfig()

      // @ts-ignore webpack-chain types
      // @see https://github.com/neutrinojs/webpack-chain/blob/main/src/Config.js
      const output = webpackChain.toString(config)
      console.log(highlight(output, { language: 'js' }))
    }
  )
}

export default inspect
