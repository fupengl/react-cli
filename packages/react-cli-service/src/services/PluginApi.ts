import path from 'node:path'
import fs from 'node:fs'
import type { Configuration as WebpackOptions } from 'webpack'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'
import type ChainableWebpackConfig from 'webpack-chain'
import hash from 'hash-sum'
import { loadJSON, semver } from '@planjs/react-cli-shared-utils'

import { matchesPluginId } from '../utils/plugin.js'
import type Service from './Service.js'
import type { CommandItem } from './Service.js'

class PluginApi {
  id: string
  service: Service

  constructor(id: string, service: Service) {
    this.id = id
    this.service = service
  }

  get version(): string {
    return this.service.packageJson.version!
  }

  used = {
    typescript: (): boolean => fs.existsSync(this.resolve('tsconfig.json')),
    tailwind: (): boolean => fs.existsSync(this.resolve('tailwind.config.js')),
    babel: (): boolean =>
      ['.babelrc', 'babel.config.js'].some((f) =>
        fs.existsSync(this.resolve(f))
      )
  }

  assertVersion(range: number | string): void {
    if (typeof range === 'number') {
      if (!Number.isInteger(range)) {
        throw new Error('Expected string or integer value.')
      }
      range = `^${range}.0.0-0`
    }
    if (typeof range !== 'string') {
      throw new Error('Expected string or integer value.')
    }

    if (semver.satisfies(this.version, range, { includePrerelease: true }))
      return

    throw new Error(
      `Require @planjs/react-cli-service "${range}", but was loaded with "${this.version}".`
    )
  }

  /**
   * Current working directory.
   *
   * @return {string}
   */
  getCwd(): string {
    return this.service.context
  }

  /**
   * Resolve path for a project.
   *
   * @param {string} _path - Relative path from project root
   * @return {string} The resolved absolute path.
   */
  resolve(...paths: string[]): string {
    return path.resolve(this.service.context, ...paths)
  }

  /**
   * Check if the project has a given plugin.
   *
   * @param {string} id - Plugin id, can omit the (@planjs/|vue-|@scope/vue)-cli-plugin- prefix
   * @return {boolean}
   */
  hasPlugin(id: string): boolean {
    return this.service.plugins.some((p) => matchesPluginId(id, p.id))
  }

  /**
   * Register a command that will become available as `vue-cli-service [name]`.
   *
   * @param {string} name
   * @param {object} [options]
   *   {
   *     description: string,
   *     usage: string,
   *     options: { [string]: string }
   *   }
   * @param {function} fn
   *   (args: { [string]: string }, rawArgs: string[]) => ?Promise
   */
  registerCommand(
    name: string,
    options: Omit<CommandItem, 'fn'> | CommandItem['fn'],
    fn?: CommandItem['fn']
  ): void {
    if (typeof options === 'function') {
      fn = options
      this.service.commands[name] = { fn: options }
    }
    if (typeof fn === 'function') {
      this.service.commands[name] = { ...options, fn }
    }
  }

  /**
   * Register a function that will receive a chainable webpack config
   * the function is lazy and won't be called until `resolveWebpackConfig` is
   * called
   *
   * @param {function} fn
   */
  chainWebpack(fn: (config: ChainableWebpackConfig) => void): void {
    this.service.webpackChainFns.push(fn)
  }

  /**
   * Register
   * - a webpack configuration object that will be merged into the config
   * OR
   * - a function that will receive the raw webpack config.
   *   the function can either mutate the config directly or return an object
   *   that will be merged into the config.
   *
   * @param {object | function} fn
   */
  configureWebpack(
    fn: WebpackOptions | ((config: WebpackOptions) => WebpackOptions | void)
  ): void {
    this.service.webpackRawConfigFns.push(fn)
  }

  /**
   * Register a dev serve config function. It will receive the express `app`
   * instance of the dev server.
   *
   * @param {function} fn
   */
  configureDevServer(fn: (config: WebpackDevServerOptions) => void): void {
    this.service.devServerConfigFns.push(fn)
  }

  /**
   * Resolve the final raw webpack config, that will be passed to webpack.
   *
   * @param {ChainableWebpackConfig} [chainableConfig]
   * @return {object} Raw webpack config.
   */
  resolveWebpackConfig(
    chainableConfig?: ChainableWebpackConfig
  ): WebpackOptions {
    return this.service.resolveWebpackConfig(chainableConfig)
  }

  /**
   * Resolve an intermediate chainable webpack config instance, which can be
   * further tweaked before generating the final raw webpack config.
   * You can call this multiple times to generate different branches of the
   * base webpack config.
   * See https://github.com/mozilla-neutrino/webpack-chain
   *
   * @return {ChainableWebpackConfig}
   */
  resolveChainableWebpackConfig(): ChainableWebpackConfig {
    return this.service.resolveChainableWebpackConfig()
  }

  /**
   * Generate a cache identifier from a number of variables
   */
  getCacheIdentifier(
    id: string,
    partialIdentifier: any,
    configFiles: string[] | string = []
  ): { cacheDirectory: string; cacheIdentifier: string } {
    const cacheDirectory = this.resolve(`node_modules/.cache/${id}`)

    // replace \r\n to \n generate consistent hash
    const fmtFunc = (conf: any) => {
      if (typeof conf === 'function') {
        return conf.toString().replace(/\r\n?/g, '\n')
      }
      return conf
    }

    const variables: any = {
      partialIdentifier,
      'cli-service': loadJSON('../../package.json', import.meta.url).version,
      env: process.env.NODE_ENV,
      test: !!process.env.REACT_CLI_TEST,
      config: [
        fmtFunc(this.service.userOptions.chainWebpack),
        fmtFunc(this.service.userOptions.configureWebpack)
      ]
    }

    if (!Array.isArray(configFiles)) {
      configFiles = [configFiles]
    }
    configFiles = configFiles.concat([
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ])

    const readConfig = (file: string) => {
      const absolutePath = this.resolve(file)
      if (!fs.existsSync(absolutePath)) {
        return
      }
      try {
        return fs.readFileSync(absolutePath, 'utf-8')
      } catch (e) {}
    }

    variables.configFiles = configFiles.map((file) => {
      const content = readConfig(file)
      return content && content.replace(/\r\n?/g, '\n')
    })

    const cacheIdentifier = hash(variables)
    return { cacheDirectory, cacheIdentifier }
  }
}

export default PluginApi
