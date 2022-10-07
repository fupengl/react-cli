import { createRequire } from 'node:module'
import path from 'node:path'

import type { Stats } from 'webpack'
import webpack from 'webpack'
import fs from 'fs-extra'
import { chalk, logger } from '@planjs/react-cli-shared-utils'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

import { checkBrowsers } from '../utils/browsersHelper.js'
import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild
} from '../utils/FileSizeReporter.js'
import formatWebpackMessages from '../utils/formatWebpackMessages.js'
import printBuildError from '../utils/printBuildError.js'
import printHostingInstructions from '../utils/printHostingInstructions.js'
import {
  WARN_AFTER_BUNDLE_GZIP_SIZE,
  WARN_AFTER_CHUNK_GZIP_SIZE
} from '../constants/config.js'

import type { ServicePlugin } from '../types.js'

const build: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.registerCommand(
    'build',
    {
      description: 'build for production',
      usage: 'react-cli-service build [options] [entry|pattern]',
      options: {
        '--mode': `specify env mode (default: production)`,
        '--stats': `output "bundle-stats.json"`,
        '--dest': `specify output directory (default: ${options.outputDir})`,
        '--print-config': 'output current webpack configuration',
        '--report': `generate report.html to help analyze bundle content`,
        '--report-json': 'generate report.json to help analyze bundle content',
        '--clean': `remove the dist directory contents before building the project (default: true)`
      }
    },
    async (args, rawArgv) => {
      process.env.BABEL_ENV = 'production'
      process.env.NODE_ENV = 'production'

      const webpackConfig = api.resolveWebpackConfig()
      const isInteractive = process.stdout.isTTY
      const appBuild = api.resolve(args.dest || options.outputDir!)
      const writeStatsJson = !!args.stats

      if (args['print-config']) {
        fs.outputFileSync(
          api.resolve('webpack.config.js'),
          api.resolveChainableWebpackConfig().toString()
        )
        logger.log(`  print ${chalk.cyan('webpack.config.js')} success.`)
        console.log()
        return
      }

      try {
        await checkBrowsers(api.service.context, isInteractive)
        const previousFileSizes = await measureFileSizesBeforeBuild(appBuild)
        if (args.clean !== 'false') {
          fs.emptyDirSync(appBuild)
        }
        // Merge with the public folder
        fs.copySync(api.resolve('public'), appBuild, {
          dereference: true,
          filter: (file) => file !== api.resolve('public', options.indexPath!)
        })

        console.log('Creating an optimized production build...')

        // add report
        if (args.report || args['report-json']) {
          webpackConfig?.plugins?.push(
            new BundleAnalyzerPlugin({
              logLevel: 'warn',
              openAnalyzer: false,
              analyzerMode: args.report ? 'static' : 'disabled',
              reportFilename: `report.html`,
              statsFilename: `report.json`,
              generateStatsFile: !!args['report-json']
            })
          )
        }

        // rewrite app build
        webpackConfig.output!.path = appBuild

        // Start the webpack build
        const compiler = webpack(webpackConfig)
        const { stats, warnings } = await new Promise<{
          stats: Stats
          warnings: string[]
        }>((resolve, reject) => {
          compiler.run((err, stats) => {
            let messages
            if (err) {
              if (!err.message) {
                return reject(err)
              }

              let errMessage = err.message

              // Add additional information for postcss errors
              if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
                errMessage +=
                  '\nCompileError: Begins at CSS selector ' +
                  // @ts-ignore
                  err['postcssNode'].selector
              }

              messages = formatWebpackMessages({
                errors: [errMessage],
                warnings: []
              })
            } else {
              messages = formatWebpackMessages(
                stats!.toJson({ all: false, warnings: true, errors: true })
              )
            }

            if (messages.errors.length) {
              // Only keep the first error. Others are often indicative
              // of the same problem, but confuse the reader with noise.
              if (messages.errors.length > 1) {
                messages.errors.length = 1
              }
              return reject(new Error(messages.errors.join('\n\n')))
            }

            if (
              process.env.CI &&
              (typeof process.env.CI !== 'string' ||
                process.env.CI.toLowerCase() !== 'false') &&
              messages.warnings.length
            ) {
              // Ignore sourcemap warnings in CI builds. See #8227 for more info.
              const filteredWarnings = messages.warnings.filter(
                (w: string) => !/Failed to parse source map/.test(w)
              )
              if (filteredWarnings.length) {
                console.log(
                  chalk.yellow(
                    '\nTreating warnings as errors because process.env.CI = true.\n' +
                      'Most CI servers set it automatically.\n'
                  )
                )
                return reject(new Error(filteredWarnings.join('\n\n')))
              }
            }

            const resolveArgs: {
              stats: Stats
              warnings: string[]
            } = {
              stats: stats!,
              warnings: messages.warnings
            }

            if (writeStatsJson) {
              return require('bfj')
                .write(
                  options.outputDir + '/bundle-stats.json',
                  stats!.toJson()
                )
                .then(() => resolve(resolveArgs))
                .catch((error: string) => reject(new Error(error)))
            }

            return resolve(resolveArgs)
          })
        })

        if (warnings.length) {
          console.log(chalk.yellow('Compiled with warnings.\n'))
          console.log(warnings.join('\n\n'))
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
        } else {
          console.log(chalk.green('Compiled successfully.\n'))
        }

        console.log('File sizes after gzip:\n')
        printFileSizesAfterBuild(
          stats,
          previousFileSizes,
          appBuild,
          WARN_AFTER_BUNDLE_GZIP_SIZE,
          WARN_AFTER_CHUNK_GZIP_SIZE
        )
        console.log()

        const appPackage = api.service.packageJson
        const publicUrl = options.publicPath!
        const publicPath = options.outputDir!
        const buildFolder = path.relative(
          process.cwd(),
          api.resolve(options.outputDir!)
        )
        printHostingInstructions(
          appPackage,
          publicUrl,
          publicPath,
          buildFolder,
          api.npmClient
        )
      } catch (err) {
        const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true'
        if (tscCompileOnError) {
          console.log(
            chalk.yellow(
              'Compiled with the following type errors (you may want to check these before deploying your app):\n'
            )
          )
          printBuildError(err)
        } else {
          console.log(chalk.red('Failed to compile.\n'))
          printBuildError(err)
          return Promise.reject()
        }
      }
    }
  )
}

export default build
