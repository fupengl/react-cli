import fs from 'node:fs'
import { createRequire } from 'node:module'

import type { ServicePlugin } from '../types.js'
import evalSourceMapMiddleware from '../webpack/middlewares/evalSourceMapMiddleware.js'
import noopServiceWorkerMiddleware from '../webpack/middlewares/noopServiceWorkerMiddleware.js'
import redirectServedPath from '../webpack/middlewares/redirectServedPathMiddleware.js'

const devServer: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack(() => {
    api.configureDevServer((middlewares, devServer) => {
      middlewares.unshift({
        name: 'evalSourceMapMiddleware',
        middleware: evalSourceMapMiddleware(devServer)
      })

      const proxySetupFile = api.resolve('src/setupProxy.js')
      if (fs.existsSync(proxySetupFile)) {
        require(proxySetupFile)(devServer.app)
      }

      middlewares.push({
        name: 'redirectServedPath',
        middleware: redirectServedPath(options.publicPath!)
      })

      middlewares.push({
        name: 'noopServiceWorkerMiddleware',
        middleware: noopServiceWorkerMiddleware(options.publicPath!)
      })

      return middlewares
    })
  })
}

export default devServer
