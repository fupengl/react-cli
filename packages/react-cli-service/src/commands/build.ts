import type { ServicePlugin } from '../types'

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
    (args) => {}
  )
}

export default build
