import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

import webpack from 'webpack'
import { chalk, clearConsole, semver } from '@planjs/react-cli-shared-utils'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import WebpackDevServer from 'webpack-dev-server'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'

import { checkBrowsers } from '../utils/browsersHelper.js'
import choosePort from '../utils/choosePort.js'
import formatDevUrl from '../utils/formatDevUrl.js'
import type { ServicePlugin } from '../types.js'
import formatWebpackMessages from '../utils/formatWebpackMessages.js'
import printInstructions from '../utils/printInstructions.js'
import ignoredFiles from '../utils/ignoredFiles.js'
import getPublicUrlOrPath from '../utils/getPublicUrlOrPath.js'

const defaults = {
  host: '0.0.0.0',
  port: 3000,
  https: false
}

const start: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

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

      try {
        const isInteractive = process.stdout.isTTY
        const DEFAULT_PORT =
          parseInt(args.port || process.env.PORT!, 10) || 3000
        const HOST = args.host || process.env.HOST || '0.0.0.0'
        const protocol =
          args.https || process.env.HTTPS === 'true' ? 'https' : 'http'
        const sockHost = process.env.WDS_SOCKET_HOST
        const sockPath = process.env.WDS_SOCKET_PATH // default: '/ws'
        const sockPort = process.env.WDS_SOCKET_PORT
        const disableFirewall =
          !api.service.packageJson.proxy ||
          process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true'

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

        options.publicPath = getPublicUrlOrPath(
          api.service.packageJson.homepage,
          options.publicPath,
          true
        )

        const webpackConfig = api.resolveWebpackConfig()

        webpackConfig.infrastructureLogging = {
          ...webpackConfig.infrastructureLogging,
          level: 'none'
        }
        webpackConfig.stats = 'errors-only'

        // create compiler
        const compiler = webpack(webpackConfig)

        let isFirstCompile = true
        const react = require(require.resolve('react', {
          paths: [api.service.context]
        }))

        if (api.used.typescript()) {
          ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler).waiting.tap(
            'awaitingTypeScriptCheck',
            () => {
              console.log(
                chalk.yellow(
                  'Files successfully emitted, waiting for typecheck results...'
                )
              )
            }
          )
        }

        compiler.hooks.invalid.tap('invalid', () => {
          if (isInteractive) {
            clearConsole()
          }
          console.log('Compiling...')
        })

        compiler.hooks.done.tap('done', async (stats) => {
          if (isInteractive) {
            clearConsole()
          }

          const statsData = stats.toJson({
            all: false,
            warnings: true,
            errors: true
          })

          const messages = formatWebpackMessages(statsData)
          const isSuccessful =
            !messages.errors.length && !messages.warnings.length
          if (isSuccessful) {
            console.log(chalk.green('Compiled successfully!'))
          }
          if (isSuccessful && (isInteractive || isFirstCompile)) {
            printInstructions(api.appName, urls, api.npmClient)
          }
          isFirstCompile = false

          // If errors exist, only show errors.
          if (messages.errors.length) {
            // Only keep the first error. Others are often indicative
            // of the same problem, but confuse the reader with noise.
            if (messages.errors.length > 1) {
              messages.errors.length = 1
            }
            console.log(chalk.red('Failed to compile.\n'))
            console.log(messages.errors.join('\n\n'))
            return
          }

          // Show warnings if no errors were found.
          if (messages.warnings.length) {
            console.log(chalk.yellow('Compiled with warnings.\n'))
            console.log(messages.warnings.join('\n\n'))

            // Teach some ESLint tricks.
            console.log(
              '\nSearch for the ' +
                chalk.underline(chalk.yellow('keywords')) +
                ' to learn more about each warning.'
            )
            console.log(
              'To ignore, add ' +
                chalk.cyan('// eslint-disable-next-line') +
                ' to the line before.\n'
            )
          }
        })

        const devServerOptions: WebpackDevServerOptions = {
          host: HOST,
          port,
          allowedHosts: disableFirewall ? 'all' : [urls.lanUrlForConfig],
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*'
          },
          compress: true,
          static: {
            directory: api.resolve('public'),
            publicPath: [options.publicPath!],
            watch: {
              ignored: ignoredFiles(api.service.context)
            }
          },
          client: {
            webSocketURL: {
              hostname: sockHost,
              pathname: sockPath,
              port: sockPort
            },
            overlay: {
              errors: true,
              warnings: false
            }
          },
          devMiddleware: {
            publicPath: options.publicPath!.slice(0, -1)
          },
          historyApiFallback: {
            disableDotRule: true,
            index: options.publicPath
          },
          proxy: api.service.packageJson.proxy,
          setupMiddlewares(middlewares, devServer) {
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

            const proxySetupFile = api.resolve('src/setupProxy.js')
            if (fs.existsSync(proxySetupFile)) {
              require(proxySetupFile)(devServer.app)
            }

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

            return middlewares
          }
        }

        const devServer = new WebpackDevServer(devServerOptions, compiler)

        // Launch WebpackDevServer.
        devServer.startCallback(() => {
          if (isInteractive) {
            clearConsole()
          }

          if (options.fastRefresh && semver.lt(react.version, '16.10.0')) {
            console.log(
              chalk.yellow(
                `Fast Refresh requires React 16.10 or higher. You are using React ${react.version}.`
              )
            )
          }

          console.log(chalk.cyan('Starting the development server...\n'))
        })
        ;['SIGINT', 'SIGTERM'].forEach(function (sig) {
          process.on(sig, function () {
            devServer.close()
            process.exit()
          })
        })

        if (process.env.CI !== 'true') {
          // Gracefully exit when stdin ends
          process.stdin.on('end', function () {
            devServer.close()
            process.exit()
          })
        }
      } catch (err) {
        console.log(chalk.red('Failed to compile.'))
        console.log()
        console.log(err.message || err)
        console.log()
        return Promise.reject()
      }
    }
  )
}

function base64SourceMap(source: any) {
  const base64 = Buffer.from(JSON.stringify(source.map()), 'utf8').toString(
    'base64'
  )
  return `data:application/json;charset=utf-8;base64,${base64}`
}

function getSourceById(server: WebpackDevServer, id: string): any {
  // @ts-ignore
  const module = Array.from(server.stats.compilation.modules).find(
    // @ts-ignore
    (m) => server.stats.compilation.chunkGraph.getModuleId(m) === id
  )
  // @ts-ignore
  return module?.originalSource()
}

export default start
