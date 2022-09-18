import os from 'node:os'
import { createSchema } from '@planjs/react-cli-shared-utils'

import type { UserConfig } from './types'

export const schema = createSchema((joi) => joi.object({}))

export const defaultOptions: UserConfig = {
  // project deployment base
  publicPath: '/',

  // where to output built files
  outputDir: 'dist',

  // where to put static assets (js/css/img/font/...)
  assetsDir: '',

  // filename for index.html (relative to outputDir)
  indexPath: 'index.html',

  // whether filename will contain hash part
  filenameHashing: true,

  // whether to transpile all dependencies
  transpileDependencies: false,

  // sourceMap for production build?
  productionSourceMap: !process.env.REACT_CLI_TEST,

  // use thread-loader for babel & TS in production build
  // enabled by default if the machine has more than 1 cores
  parallel: hasMultipleCores(),

  // multi-page config
  pages: undefined,

  // <script type="module" crossorigin="use-credentials">
  // #1656, #1867, #2025
  crossorigin: undefined,

  // subresource integrity
  integrity: false,

  css: {
    // extract: true,
    // modules: false,
    // sourceMap: false,
    // loaderOptions: {}
  },

  // whether to use eslint-loader
  lintOnSave: 'default',

  devServer: {
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
}

function hasMultipleCores() {
  try {
    return os.cpus().length > 1
  } catch (e) {
    return false
  }
}
