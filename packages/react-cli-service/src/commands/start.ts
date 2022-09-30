import webpack from 'webpack'
import {} from '@planjs/react-cli-shared-utils'

import { checkBrowsers } from '../utils/browsersHelper.js'
import choosePort from '../utils/choosePort.js'
import formatDevUrl from '../utils/formatDevUrl.js'
import type { ServicePlugin } from '../types.js'

const defaults = {
  host: '0.0.0.0',
  port: 3000,
  https: false
}

const start: ServicePlugin = (api, options) => {
  api.registerCommand(
    'start',
    {
      description: 'start development server',
      usage: 'react-cli-service serve [options] [entry]',
      options: {
        '--open': `open browser on server start`,
        '--copy': `copy url to clipboard on server start`,
        '--stdin': `close when stdin ends`,
        '--mode': `specify env mode (default: development)`,
        '--host': `specify host (default: ${defaults.host})`,
        '--port': `specify port (default: ${defaults.port})`,
        '--https': `use https (default: ${defaults.https})`,
        '--public': `specify the public network URL for the HMR client`
      }
    },
    async (args) => {
      process.env.BABEL_ENV = 'development'
      process.env.NODE_ENV = 'development'

      const isInteractive = process.stdout.isTTY
      const DEFAULT_PORT = parseInt(args.port || process.env.PORT!, 10) || 3000
      const HOST = args.host || process.env.HOST || '0.0.0.0'
      const protocol =
        args.https || process.env.HTTPS === 'true' ? 'https' : 'http'

      await checkBrowsers(api.service.context, isInteractive)
      const port = await choosePort(HOST, DEFAULT_PORT)
      if (port == null) {
        return
      }

      const urls = formatDevUrl(
        protocol,
        HOST,
        port,
        options.publicPath!.slice(0, -1)
      )

      console.log(urls.lanUrlForTerminal)

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
