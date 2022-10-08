import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import type Server from 'webpack-dev-server'

import type { ServicePlugin } from '../types.js'

const devServer: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack(() => {
    api.configureDevServer(
      (middlewares, devServer) => {
        devServer.app!.use(function handleWebpackInternalMiddleware(
          req,
          res,
          next
        ) {
          if (req.url.startsWith('/__get-internal-source')) {
            const fileName = req.query.fileName! as string
            const id = fileName?.match(/webpack-internal:\/\/\/(.+)/)?.[1]
            // @ts-ignore
            if (!id || !devServer.stats) {
              next()
            }

            const source = getSourceById(devServer, id!)
            const sourceMapURL = `//# sourceMappingURL=${base64SourceMap(
              source
            )}`
            const sourceURL = `//# sourceURL=webpack-internal:///${module.id}`
            res.end(`${source.source()}\n${sourceMapURL}\n${sourceURL}`)
          } else {
            next()
          }
        })

        devServer.app!.use(function redirectServedPathMiddleware(
          req,
          res,
          next
        ) {
          const servedPath = options.publicPath!.slice(0, -1)
          if (
            servedPath === '' ||
            req.url === servedPath ||
            req.url.startsWith(servedPath)
          ) {
            next()
          } else {
            const newPath = path.posix.join(
              servedPath,
              req.path !== '/' ? req.path : ''
            )
            res.redirect(newPath)
          }
        })

        devServer.app!.use(function noopServiceWorkerMiddleware(
          req,
          res,
          next
        ) {
          if (
            req.url ===
            path.posix.join(options.publicPath!, 'service-worker.js')
          ) {
            res.setHeader('Content-Type', 'text/javascript')
            res.send(
              `// This service worker file is effectively a 'no-op' that will reset any
// previous service worker registered for the same host:port combination.
// In the production build, this file is replaced with an actual service worker
// file that will precache your site's local assets.
// See https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let windowClient of windowClients) {
      // Force open pages to refresh, so that they have a chance to load the
      // fresh navigation response from the local dev server.
      windowClient.navigate(windowClient.url);
    }
  });
});
`
            )
          } else {
            next()
          }
        })

        const proxySetupFile = api.resolve('src/setupProxy.js')
        if (fs.existsSync(proxySetupFile)) {
          require(proxySetupFile)(devServer.app)
        }

        return middlewares
      }
    )
  })
}

function base64SourceMap(source: any) {
  const base64 = Buffer.from(JSON.stringify(source.map()), 'utf8').toString(
    'base64'
  )
  return `data:application/json;charset=utf-8;base64,${base64}`
}

function getSourceById(server: Server, id: string): any {
  // @ts-ignore
  const module = Array.from(server.stats.compilation.modules).find(
    // @ts-ignore
    (m) => server.stats.compilation.chunkGraph.getModuleId(m) === id
  )
  // @ts-ignore
  return module?.originalSource()
}

export default devServer
