import os from 'node:os'
import type { SchemaType } from '@planjs/react-cli-shared-utils'
import { createSchema } from '@planjs/react-cli-shared-utils'

import type { UserConfig } from './types.js'

export const schema: SchemaType = createSchema((joi) =>
  joi.object({
    publicPath: joi.string().allow(''),
    outputDir: joi.string(),
    indexPath: joi.string().allow(''),
    filenameHashing: joi.boolean(),
    disableLint: joi.boolean(),
    fastRefresh: joi.boolean(),
    lintOnSave: joi.any().valid(true, false, 'error', 'warning', 'default'),
    inlineRuntime: joi.boolean(),
    assetsDir: joi.string().allow(''),
    productionSourceMap: joi.boolean(),
    parallel: joi.alternatives().try(joi.boolean(), joi.number().integer()),
    devServer: joi.object(),
    pages: joi.object().pattern(
      /\w+/,
      joi.alternatives().try(
        joi.string().required(),
        joi.array().items(joi.string().required()),

        joi
          .object()
          .keys({
            entry: joi
              .alternatives()
              .try(
                joi.string().required(),
                joi.array().items(joi.string().required())
              )
              .required()
          })
          .unknown(true)
      )
    ),
    terser: joi.object({
      minify: joi.string().valid('terser', 'esbuild', 'swc', 'uglifyJs'),
      terserOptions: joi.object()
    }),
    chainWebpack: joi.func(),
    configureWebpack: joi.alternatives().try(joi.object(), joi.func()),
    configureDevServer: joi.object(),
    css: joi.object({
      extract: joi.alternatives().try(joi.boolean(), joi.object()),
      sourceMap: joi.boolean(),
      loaderOptions: joi.object({
        css: joi.object(),
        sass: joi.object(),
        less: joi.object(),
        stylus: joi.object(),
        postcss: joi.object()
      })
    })
  })
)

// TODO react env
export const defaultOptions: () => UserConfig = () => ({
  // project deployment base
  publicPath: process.env.PUBLIC_URL,

  // where to output built files
  outputDir: process.env.BUILD_PATH || 'build',

  // where to put static assets (js/css/img/font/...)
  assetsDir: '',

  // filename for index.html (relative to outputDir)
  indexPath: 'index.html',

  // whether filename will contain hash part
  filenameHashing: true,

  // embed the runtime script into index.html
  inlineRuntime: process.env.INLINE_RUNTIME_CHUNK !== 'false',

  // sourceMap for production build?
  productionSourceMap: process.env.GENERATE_SOURCEMAP !== 'false',

  // use thread-loader for babel & TS in production build
  // enabled by default if the machine has more than 1 cores
  parallel: hasMultipleCores(),

  // multi-page config
  pages: undefined,

  css: {
    // extract: true,
    // modules: false,
    // sourceMap: false,
    // loaderOptions: {}
  },

  // disable eslint plugin
  disableLint: process.env.DISABLE_ESLINT_PLUGIN === 'true',

  // whether to use eslint-loader
  lintOnSave: 'default',

  fastRefresh: process.env.FAST_REFRESH !== 'false',

  configureDevServer: {
    /*
    open: process.platform === 'darwin',
    host: '0.0.0.0',
    port: 8080,
    https: false,
    hotOnly: false,
    proxy: null, // string | Object
    before: app => {}
  */
  }
})

function hasMultipleCores() {
  try {
    return os.cpus().length > 1
  } catch (e) {
    return false
  }
}
