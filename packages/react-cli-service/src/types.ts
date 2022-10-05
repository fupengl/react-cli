import type { Configuration as WebpackOptions } from 'webpack'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'
import type ChainableWebpackConfig from 'webpack-chain'
import type { MinifyOptions } from 'terser'

import type PluginApi from './services/PluginApi.js'

type PredefinedOptions<T> = T & { [key: string]: any }

type PageEntry = string | string[]

interface PageConfig {
  entry: PageEntry
  [key: string]: any
}

interface ExtractOptions {
  filename?: string
  chunkFilename?: string
}

interface LoaderOptions {
  css?: object
  sass?: object
  less?: object
  stylus?: object
  postcss?: object
}

interface CSSOptions {
  /**
   * Default: `true`
   *
   * By default, only files that ends in `*.module.[ext]` are treated as CSS modules
   */
  requireModuleExtension?: boolean
  /**
   * Default: `true`
   *
   * Whether to extract CSS in your components into a standalone CSS files (instead of inlined in JavaScript and injected dynamically)
   */
  extract?: boolean | ExtractOptions
  /**
   * Default: `false`
   *
   * Whether to enable source maps for CSS. Setting this to `true` may affect build performance
   */
  sourceMap?: boolean
  /**
   * Default: `{}`
   *
   * Pass options to CSS-related loaders
   */
  loaderOptions?: LoaderOptions
}

export type ServicePlugin = (api: PluginApi, options: UserConfig) => any

export declare interface UserConfig {
  /**
   * Default: `'/'`
   *
   * The base URL your application bundle will be deployed at
   * If not set, it can also be set through the homepage field in package.json
   * If not set, it can also be set through the environment variable `PUBLIC_URL`
   */
  publicPath?: string

  /**
   * Default: `'build'`
   *
   * The directory where the production build files will be generated in when running `react-cli-service build`
   */
  outputDir?: string

  /**
   * Default: `''`
   *
   * A directory (relative to `outputDir`) to nest generated static assets (js, css, img, fonts) under
   */
  assetsDir?: string

  /**
   * Default: `'index.html'`
   *
   * Specify the output path for the generated `index.html` (relative to `outputDir`). Can also be an absolute path
   */
  indexPath?: string

  /**
   * Default: `true`
   *
   * By default, generated static assets contains hashes in their filenames for better caching control
   */
  filenameHashing?: boolean

  /**
   * Default: `false`
   *
   * If set to `true`, all dependencies in `node_modules` will be transpiled by Babel;
   * Or, if you only want to selectively transpile some of the dependencies, you can list them
   * in this option.
   */
  transpileDependencies?: boolean | Array<string | RegExp>

  /**
   * Default: `true`
   *
   * By default, will embed the runtime script into index.html during the production build.
   * When set to false, the script will not be embedded and will be imported as usual.
   * This is normally required when dealing with CSP.
   */
  inlineRuntime?: boolean

  /**
   * Default: `true`
   *
   * Setting this to `false` can speed up production builds if you don't need source maps for production
   */
  productionSourceMap?: boolean

  /**
   * Default: `require('os').cpus().length > 1`
   *
   * Whether to use `thread-loader` for Babel or TypeScript transpilation
   */
  parallel?: boolean | number

  /**
   * [All options for `webpack-dev-server`](https://webpack.js.org/configuration/dev-server/) are supported
   */
  configureDevServer?: WebpackDevServerOptions

  /**
   * Default: `undefined`
   *
   * Build the app in multi-page mode
   */
  pages?: {
    [key: string]: PageEntry | PageConfig
  }

  /**
   * Default: `undefined`
   *
   * Configure the `crossorigin` attribute on `<link rel="stylesheet">` and `<script>` tags in generated HTML
   */
  crossorigin?: '' | 'anonymous' | 'use-credentials'

  /**
   * Default: `false`
   *
   * Set to `true` to enable [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (SRI) on `<link rel="stylesheet">` and `<script>` tags in generated HTML
   */
  integrity?: boolean

  css?: CSSOptions

  /**
   * A function that will receive an instance of `ChainableConfig` powered by [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain)
   */
  chainWebpack?: (config: ChainableWebpackConfig) => void

  /**
   * Set webpack configuration.  If the value is `Object`, will be merged into config.  If value is `Function`, will receive current config as argument
   */
  configureWebpack?:
    | WebpackOptions
    | ((config: WebpackOptions) => WebpackOptions | void)

  /**
   * Default: `'false'`
   *
   * Disable `eslint-webpack-plugin`, no eslint checks will be done after setting
   */
  disableLint?: boolean

  /**
   * Default: `'default'`
   *
   * Whether to perform lint-on-save during development using [eslint-loader](https://github.com/webpack-contrib/eslint-loader)
   */
  lintOnSave?: boolean | 'default' | 'warning' | 'error'

  /**
   * set terser-webpack-plugin minify and terserOptions
   */
  terser?: {
    /**
     * Supported minify: [terser](https://github.com/webpack-contrib/terser-webpack-plugin#minify), [esbuild](https://github.com/webpack-contrib/terser-webpack-plugin#esbuild), [swc](https://github.com/webpack-contrib/terser-webpack-plugin#swc), [uglifyJs](https://github.com/webpack-contrib/terser-webpack-plugin#uglify-js). currently we do not allow custom minify function
     *
     * In the non-terser case, you should install the corresponding package (eg. `npm i esbuild -D`)
     *
     */
    minify: 'terser' | 'esbuild' | 'swc' | 'uglifyJs'
    /**
     * `terserOptions` options will be passed to minify
     *
     * [All options for `terser`](https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions)
     *
     * [All options for `esbuild`](https://github.com/evanw/esbuild/blob/master/lib/shared/types.ts#L160-L174)
     *
     * [All options for `swc`](https://swc.rs/docs/config-js-minify)
     *
     * [All options for `uglifyJs`](https://github.com/mishoo/UglifyJS#minify-options)
     */
    terserOptions?: PredefinedOptions<MinifyOptions>
  }

  /**
   * Default `true`
   *
   * When set to false, disables experimental support for Fast Refresh to allow you to tweak your components in real time without reloading the page.
   */
  fastRefresh?: boolean

  /**
   * This is an object that doesn't go through any schema validation, so it can be used to pass arbitrary options to 3rd party plugins
   */
  pluginOptions?: object
}
