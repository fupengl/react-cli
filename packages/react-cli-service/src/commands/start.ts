import { createRequire } from 'node:module'

import webpack from 'webpack'
import {
  chalk,
  clearConsole,
  logger,
  semver
} from '@planjs/react-cli-shared-utils'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import WebpackDevServer from 'webpack-dev-server'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'
import clipboard from 'clipboardy'
import defaultsDeep from 'lodash.defaultsdeep'
import { isFunction } from '@planjs/utils'

import fs from 'fs-extra'
import { checkBrowsers } from '../utils/browsersHelper.js'
import choosePort from '../utils/choosePort.js'
import formatDevUrl from '../utils/formatDevUrl.js'
import type { ServicePlugin } from '../types.js'
import formatWebpackMessages from '../utils/formatWebpackMessages.js'
import printInstructions from '../utils/printInstructions.js'
import ignoredFiles from '../utils/ignoredFiles.js'
import getPublicUrlOrPath from '../utils/getPublicUrlOrPath.js'
import getHttpsConfig from '../utils/getHttpsConfig.js'

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
        '--public': `specify the public network URL for the HMR client`,
        '--print-config': 'output current webpack configuration'
      }
    },
    async (args) => {
      process.env.BABEL_ENV = 'development'
      process.env.NODE_ENV = 'development'

      try {
        const isInteractive = process.stdout.isTTY
        const DEFAULT_PORT =
          parseInt(args.port || process.env.PORT!, 10) || 3000
        const host = args.host || process.env.HOST || '0.0.0.0'
        const protocol =
          args.https || process.env.HTTPS === 'true' ? 'https' : 'http'
        const sockHost = process.env.WDS_SOCKET_HOST
        const sockPath = process.env.WDS_SOCKET_PATH // default: '/ws'
        const sockPort = process.env.WDS_SOCKET_PORT
        const disableFirewall =
          !api.service.packageJson.proxy ||
          process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true'

        await checkBrowsers(api.service.context, isInteractive)
        const port = await choosePort(host, DEFAULT_PORT)
        if (port == null) {
          return
        }

        options.publicPath = getPublicUrlOrPath(
          api.service.packageJson.homepage,
          options.publicPath,
          true
        )

        const urls = formatDevUrl(
          protocol,
          host,
          port,
          options.publicPath!.slice(0, -1)
        )

        const webpackConfig = api.resolveWebpackConfig()

        webpackConfig.infrastructureLogging = {
          ...webpackConfig.infrastructureLogging,
          level: 'none'
        }
        webpackConfig.stats = 'errors-only'

        if (args['print-config']) {
          fs.outputFileSync(
            api.resolve('webpack.config.js'),
            api.resolveChainableWebpackConfig().toString()
          )
          logger.log(`  print ${chalk.cyan('webpack.config.js')} success.`)
          console.log()
          return
        }

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
            if (args.copy) {
              clipboard.writeSync(urls.localUrlForBrowser)
            }

            printInstructions(api.appName, urls, api.npmClient, args.copy)
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
          host,
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
          open: args.open,
          setupExitSignals: true,
          https:
            protocol === 'https' ? getHttpsConfig(api.service.context) : false
        }

        if (isFunction(webpackConfig?.devServer?.setupMiddlewares)) {
          api.configureDevServer(webpackConfig.devServer!.setupMiddlewares)
        }

        if (isFunction(options.configureDevServer?.setupMiddlewares)) {
          api.configureDevServer(options.configureDevServer!.setupMiddlewares)
        }

        const devServer = new WebpackDevServer(
          defaultsDeep(
            devServerOptions,
            webpackConfig.devServer,
            options.configureDevServer,
            {
              setupMiddlewares(middlewares, devServer) {
                api.service.devServerConfigFns
                  .filter(isFunction)
                  .forEach((fn) => middlewares.concat(fn!([], devServer) || []))

                return middlewares
              }
            } as WebpackDevServerOptions
          ),
          compiler
        )

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

        if (process.env.CI !== 'true' && !args.stdin) {
          // Gracefully exit when stdin ends
          process.stdin.on('end', function () {
            devServer.close()
            process.exit()
          })
        }

        if (args.stdin) {
          process.stdin.on('end', () => {
            devServer.stopCallback(() => {
              process.exit(0)
            })
          })

          process.stdin.resume()
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

start.defaultModes = {
  build: 'development'
}

export default start
