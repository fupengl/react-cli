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
    (args) => {
      process.env.BABEL_ENV = 'production'
      process.env.NODE_ENV = 'production'
    }
  )
}

export default build
