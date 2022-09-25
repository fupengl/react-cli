import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import resolve from 'resolve'

import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import {
  getCurrentDirName,
  getCurrentFileName
} from '@planjs/react-cli-shared-utils'

import getClientEnvironment from '../utils/getClientEnvironment.js'
import { moduleFileExtensions } from '../constants/config.js'
import getModules from '../utils/modules.js'
import ModuleScopePlugin from '../webpack/ModuleScopePlugin.js'
import InlineChunkHtmlPlugin from '../webpack/InlineChunkHtmlPlugin.js'
import InterpolateHtmlPlugin from '../webpack/InterpolateHtmlPlugin.js'
import getEslintFormatter from '../webpack/eslintFormatter.js'
import tryPrefixPath from '../utils/tryPrefixPath.js'

import type { ServicePlugin } from '../types.js'

const base: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack((config) => {
    const env = getClientEnvironment(options.publicPath!, options)
    const isEnvProduction = process.env.NODE_ENV === 'production'
    const isEnvDevelopment = process.env.NODE_ENV === 'development'
    const shouldUseSourceMap = options.productionSourceMap
    const hasJsxRuntime = (() => {
      if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
        return false
      }

      try {
        require.resolve('react/jsx-runtime')
        return true
      } catch (e) {
        return false
      }
    })()

    // base
    config.target('browserslist')
    config.stats('errors-warnings')
    config.set('infrastructureLogging', { level: 'none' })
    config.set('performance', false)
    config.bail(isEnvProduction)
    config.mode(
      isEnvProduction ? 'production' : isEnvDevelopment ? 'development' : 'none'
    )
    config.devtool(
      isEnvProduction
        ? shouldUseSourceMap
          ? 'source-map'
          : false
        : isEnvDevelopment && 'cheap-module-source-map'
    )
    config.entry('app').add(api.resolve('src/index'))

    // output
    config.output.path(api.resolve(options.outputDir!))
    config.output.pathinfo(isEnvDevelopment)
    const outputDir = tryPrefixPath(
      isEnvProduction
        ? `static/js/[name]${
            options.productionSourceMap ? '.[contenthash:8]' : ''
          }.js`
        : isEnvDevelopment
        ? 'static/js/bundle.js'
        : '',
      options.assetsDir
    )
    config.output.filename(outputDir)
    config.output.chunkFilename(outputDir)
    config.output.set('assetModuleFilename', 'static/media/[name].[hash][ext]')
    config.output.publicPath(options.publicPath!)
    config.output.devtoolModuleFilenameTemplate(
      isEnvProduction
        ? (info: { absoluteResourcePath: string }) =>
            path
              .relative(path.resolve('src'), info.absoluteResourcePath)
              .replace(/\\/g, '/')
        : isEnvDevelopment &&
            ((info: { absoluteResourcePath: string }) =>
              path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'))
    )

    // cache
    const { cacheDirectory, cacheIdentifier } = api.getCacheIdentifier(
      'webpack',
      env.raw
    )
    config.cache({
      type: 'filesystem',
      version: cacheIdentifier,
      cacheDirectory: cacheDirectory,
      store: 'pack',
      buildDependencies: {
        defaultWebpack: ['webpack/lib/'],
        config: [getCurrentFileName(import.meta.url)],
        tsconfig: ['tsconfig.json', 'jsconfig.json'].filter((f) =>
          fs.existsSync(api.resolve(f))
        )
      }
    })

    // resolve
    config.resolve.extensions.clear()
    moduleFileExtensions.forEach((ext) => {
      const useTypescript = api.used.typescript()
      if ((!useTypescript && !ext.includes('ts')) || useTypescript) {
        config.resolve.extensions.add(`.${ext}`)
      }
    })
    const { additionalModulePaths, webpackAliases } = getModules(api)
    const isEnvProductionProfile =
      isEnvProduction && process.argv.includes('--profile')
    config.resolve.modules.merge(
      ['node_modules', api.resolve('node_modules')]
        .concat(additionalModulePaths!)
        .filter(Boolean)
    )
    config.resolve.alias.merge({
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      'react-native': 'react-native-web',
      // Allows for better profiling with ReactDevTools
      ...(isEnvProductionProfile && {
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling'
      }),
      ...(webpackAliases || {})
    })
    const reactRefreshRuntimeEntry = require.resolve('react-refresh/runtime')
    const reactRefreshWebpackPluginRuntimeEntry = require.resolve(
      '@pmmmwh/react-refresh-webpack-plugin'
    )
    const babelRuntimeEntry = require.resolve('babel-preset-react-app')
    const babelRuntimeEntryHelpers = require.resolve(
      '@babel/runtime/helpers/esm/assertThisInitialized',
      { paths: [babelRuntimeEntry] }
    )
    const babelRuntimeRegenerator = require.resolve(
      '@babel/runtime/regenerator',
      {
        paths: [babelRuntimeEntry]
      }
    )
    // Prevents users from importing files from outside of src/ (or node_modules/).
    // This often causes confusion because we only process files within src/ with babel.
    // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
    // please link the files into your node_modules/ and let module-resolution kick in.
    // Make sure your source files are compiled, as they will not be processed in any way.
    config.resolve
      .plugin('ModuleScopePlugin')
      .use(ModuleScopePlugin, [
        api.resolve('src'),
        [
          api.resolve('package.json'),
          reactRefreshRuntimeEntry,
          reactRefreshWebpackPluginRuntimeEntry,
          babelRuntimeEntry,
          babelRuntimeEntryHelpers,
          babelRuntimeRegenerator
        ]
      ])

    // plugins
    config.plugin('HtmlWebpackPlugin').use(HtmlWebpackPlugin, [
      Object.assign(
        {
          inject: true,
          template: api.resolve('public', options.indexPath || 'index.html')
        },
        isEnvProduction
          ? {
              minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
              }
            }
          : undefined
      )
    ])
    if (options.inlineRuntime) {
      config
        .plugin('InlineChunkHtmlPlugin')
        .use(InlineChunkHtmlPlugin, [HtmlWebpackPlugin, [/runtime-.+[.]js/]])
    }
    config
      .plugin('InterpolateHtmlPlugin')
      .use(InterpolateHtmlPlugin, [HtmlWebpackPlugin, env.raw])
    config.plugin('DefinePlugin').use(webpack.DefinePlugin, [env.stringified])

    // Moment.js is an extremely popular library that bundles large locale files
    // by default due to how webpack interprets its code. This is a practical
    // solution that requires the user to opt into importing specific locales.
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    // You can remove this if you don't use Moment.js:
    config.plugin('IgnorePluginMoment').use(webpack.IgnorePlugin, [
      {
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
      }
    ])

    if (api.used.typescript()) {
      const ForkTsCheckerWebpackPlugin =
        process.env.TSC_COMPILE_ON_ERROR === 'true'
          ? require('react-dev-utils/ForkTsCheckerWarningWebpackPlugin')
          : require('react-dev-utils/ForkTsCheckerWebpackPlugin')
      // TypeScript type checking
      config
        .plugin('ForkTsCheckerWebpackPlugin')
        .use(ForkTsCheckerWebpackPlugin, [
          {
            async: isEnvDevelopment,
            typescript: {
              typescriptPath: resolve.sync('typescript', {
                basedir: api.resolve('node_modules')
              }),
              configOverwrite: {
                compilerOptions: {
                  sourceMap: isEnvProduction
                    ? shouldUseSourceMap
                    : isEnvDevelopment,
                  skipLibCheck: true,
                  inlineSourceMap: false,
                  declarationMap: false,
                  noEmit: true,
                  incremental: true,
                  tsBuildInfoFile: api.resolve(
                    'node_modules/.cache/tsconfig.tsbuildinfo'
                  )
                }
              },
              context: api.service.context,
              diagnosticOptions: {
                syntactic: true
              },
              mode: 'write-references'
              // profile: true,
            },
            issue: {
              // This one is specifically to match during CI tests,
              // as micromatch doesn't match
              // '../cra-template-typescript/template/src/App.tsx'
              // otherwise.
              include: [
                { file: '../**/src/**/*.{ts,tsx}' },
                { file: '**/src/**/*.{ts,tsx}' }
              ],
              exclude: [
                { file: '**/src/**/__tests__/**' },
                { file: '**/src/**/?(*.){spec|test}.*' },
                { file: '**/src/setupProxy.*' },
                { file: '**/src/setupTests.*' }
              ]
            },
            logger: {
              infrastructure: 'silent'
            }
          }
        ])
    }

    const { lintOnSave } = options
    const disableESLintPlugin = options.disableLint
    const emitErrorsAsWarnings =
      lintOnSave === true ||
      lintOnSave === 'warning' ||
      (lintOnSave === 'default' && process.env.ESLINT_NO_DEV_ERRORS === 'true')

    if (!disableESLintPlugin) {
      config.plugin('ESLintPlugin').use(ESLintPlugin, [
        {
          // Plugin options
          extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
          formatter: getEslintFormatter(api),
          eslintPath: require.resolve('eslint'),
          failOnWarning: options.lintOnSave === 'error',
          failOnError: !(isEnvDevelopment && emitErrorsAsWarnings),
          context: api.resolve('src/'),
          cache: true,
          cacheLocation: api.resolve('node_modules', '.cache/.eslintcache'),
          // ESLint class options
          cwd: api.service.context,
          resolvePluginsRelativeTo: getCurrentDirName(import.meta.url),
          baseConfig: {
            extends: [require.resolve('eslint-config-react-app/base')],
            rules: {
              ...(!hasJsxRuntime && {
                'react/react-in-jsx-scope': 'error'
              })
            }
          }
        }
      ])
    }

    // modules
    config.module.strictExportPresence(true)
    if (shouldUseSourceMap) {
      config.module
        .rule('source-map-loader')
        .test(/\.(js|mjs|jsx|ts|tsx|css)$/)
        .exclude.add(/@babel(?:\/|\\{1,2})runtime/)
        .end()
        .enforce('pre')
        .use('source-map-loader')
        .loader(require.resolve('source-map-loader'))
        .end()
    }

    // Process application JS with Babel.
    // The preset includes JSX, Flow, TypeScript, and some ESnext features.
    config.module
      .rule('oneOf')
      .oneOf('babel')
      .test(/\.(js|mjs|jsx|ts|tsx)$/)
      .include.add(api.resolve('src'))
      .end()
      .use('babel-loader')
      .loader(require.resolve('babel-loader'))
      .options({
        customize: require.resolve('babel-preset-react-app/webpack-overrides'),
        presets: [
          [
            require.resolve('babel-preset-react-app'),
            {
              runtime: hasJsxRuntime ? 'automatic' : 'classic'
            }
          ]
        ],
        babelrc: true,
        configFile: true,
        // Make sure we have a unique cache identifier, erring on the
        // side of caution.
        // We remove this when the user ejects because the default
        // is sane and uses Babel options. Instead of options, we use
        // the react-scripts and babel-preset-react-app versions.
        cacheIdentifier: api.getCacheIdentifier(
          `babel-cache-${process.env.NODE_ENV}`,
          [
            'babel-plugin-named-asset-import',
            'babel-preset-react-app',
            'react-dev-utils',
            'react-scripts'
          ]
        ).cacheIdentifier,
        plugins: [
          isEnvDevelopment &&
            options.fastRefresh &&
            require.resolve('react-refresh/babel')
        ].filter(Boolean),
        // This is a feature of `babel-loader` for webpack (not Babel itself).
        // It enables caching results in ./node_modules/.cache/babel-loader/
        // directory for faster rebuilds.
        cacheDirectory: true,
        // See #6846 for context on why cacheCompression is disabled
        cacheCompression: false,
        compact: isEnvProduction
      })
      .end()

    // Process any JS outside of the app with Babel.
    // Unlike the application JS, we only compile the standard ES features.
    config.module
      .rule('oneOf')
      .oneOf('babel-runtime')
      .test(/\.(js|mjs)$/)
      .exclude.add(/@babel(?:\/|\\{1,2})runtime/)
      .end()
      .use('babel-loader')
      .loader(require.resolve('babel-loader'))
      .options({
        babelrc: true,
        configFile: true,
        compact: false,
        presets: [
          [
            require.resolve('babel-preset-react-app/dependencies'),
            { helpers: true }
          ]
        ],
        cacheDirectory: true,
        // See #6846 for context on why cacheCompression is disabled
        cacheCompression: false,
        cacheIdentifier: api.getCacheIdentifier(
          `babel-cache-${process.env.NODE_ENV}`,
          [
            'babel-plugin-named-asset-import',
            'babel-preset-react-app',
            'react-dev-utils',
            'react-scripts'
          ]
        ).cacheIdentifier,
        // Babel sourcemaps are needed for debugging into node_modules
        // code.  Without the options below, debuggers like VSCode
        // show incorrect code and set breakpoints on the wrong lines.
        sourceMaps: shouldUseSourceMap,
        inputSourceMap: shouldUseSourceMap
      })

    // "file" loader makes sure those assets get served by WebpackDevServer.
    // When you `import` an asset, you get its (virtual) filename.
    // In production, they would get copied to the `build` folder.
    // This loader doesn't use a "test" so it will catch all modules
    // that fall through the other loaders.
    config.module
      .rule('oneOf')
      .oneOf('exclude-assets')
      .exclude.merge([/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/])
      .end()
      .set('type', 'asset/resource')
  })
}

export default base
