import fs from 'node:fs'
import TerserPlugin from 'terser-webpack-plugin'
import WorkboxWebpackPlugin from 'workbox-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

import type { ServicePlugin } from '../types.js'
import tryPrefixPath from '../utils/tryPrefixPath.js'

const prod: ServicePlugin = (api, options) => {
  api.chainWebpack((config) => {
    const isEnvProduction = process.env.NODE_ENV === 'production'
    // Variable used for enabling profiling in Production
    // passed into alias object. Uses a flag if passed into the build command
    const isEnvProductionProfile =
      isEnvProduction && process.argv.includes('--profile')

    const mergeTerserOptions = (defaultOptions: any) => {
      const userOptions = options.terser && options.terser.terserOptions
      // user's config is first
      return {
        ...defaultOptions,
        ...userOptions
      }
    }

    const terserMinify = () => ({
      terserOptions: mergeTerserOptions({
        parse: {
          // We want terser to parse ecma 8 code. However, we don't want it
          // to apply any minification steps that turns valid ecma 5 code
          // into invalid ecma 5 code. This is why the 'compress' and 'output'
          // sections only apply transformations that are ecma 5 safe
          // https://github.com/facebook/create-react-app/pull/4234
          ecma: 8,
        },
        compress: {
          ecma: 5,
          warnings: false,
          // Disabled because of an issue with Uglify breaking seemingly valid code:
          // https://github.com/facebook/create-react-app/issues/2376
          // Pending further investigation:
          // https://github.com/mishoo/UglifyJS2/issues/2011
          comparisons: false,
          // Disabled because of an issue with Terser breaking valid code:
          // https://github.com/facebook/create-react-app/issues/5250
          // Pending further investigation:
          // https://github.com/terser-js/terser/issues/120
          inline: 2,
        },
        mangle: {
          safari10: true,
        },
        // Added for profiling in devtools
        keep_classnames: isEnvProductionProfile,
        keep_fnames: isEnvProductionProfile,
        output: {
          ecma: 5,
          comments: false,
          // Turned on because emoji and regex is not minified properly using default
          // https://github.com/facebook/create-react-app/issues/2488
          ascii_only: true,
        },
      }),
      parallel: options.parallel,
    })

    // `terserOptions` options will be passed to `esbuild`
    // Link to options - https://esbuild.github.io/api/#minify
    const esbuildMinify = () => ({
      minify: TerserPlugin.esbuildMinify,
      terserOptions: mergeTerserOptions({
        minify: false,
        minifyWhitespace: true,
        minifyIdentifiers: false,
        minifySyntax: true
      }),
      parallel: options.parallel
    })

    // `terserOptions` options will be passed to `swc` (`@swc/core`)
    // Link to options - https://swc.rs/docs/config-js-minify
    const swcMinify = () => ({
      minify: TerserPlugin.swcMinify,
      terserOptions: mergeTerserOptions({
        compress: {
          unused: true
        },
        mangle: true
      }),
      parallel: options.parallel
    })

    // `terserOptions` options will be passed to `uglify-js`
    // Link to options - https://github.com/mishoo/UglifyJS#minify-options
    const uglifyJsMinify = () => ({
      minify: TerserPlugin.uglifyJsMinify,
      terserOptions: mergeTerserOptions({}),
      parallel: options.parallel
    })

    // Currently we do not allow custom minify function
    const getMinify = (): any => {
      const { minify = 'terser' } = options.terser || {}

      const minifyMap = {
        terser: terserMinify,
        esbuild: esbuildMinify,
        swc: swcMinify,
        uglifyJs: uglifyJsMinify
      }
      return minifyMap[minify]()
    }

    // optimization
    config.optimization.minimize(isEnvProduction)
    config.optimization.minimizer('terser').use(TerserPlugin, [getMinify()])

    if (isEnvProduction) {
      config.plugin('MiniCssExtractPlugin').use(MiniCssExtractPlugin, [
        {
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: tryPrefixPath(
            'static/css/[name].[contenthash:8].css',
            options.assetsDir
          ),
          chunkFilename: tryPrefixPath(
            'static/css/[name].[contenthash:8].chunk.css',
            options.assetsDir
          )
        }
      ])

      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the webpack build.
      if (fs.existsSync(api.resolve('src/service-worker'))) {
        config
          .plugin('WorkboxWebpackPluginInjectManifest')
          .use(WorkboxWebpackPlugin.InjectManifest, [
            {
              swSrc: api.resolve('src/service-worker'),
              dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
              exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
              // Bump up the default maximum size (2mb) that's precached,
              // to make lazy-loading failure scenarios less likely.
              // See https://github.com/cra-template/pwa/issues/13#issuecomment-722667270
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
            }
          ])
      }
    }
  })
}

export default prod
