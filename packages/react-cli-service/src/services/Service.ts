import path from 'node:path'
import dotenv from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'
import type minimist from 'minimist'
import WebpackChain from 'webpack-chain'
import type ChainableWebpackConfig from 'webpack-chain'
import { merge } from 'webpack-merge'
import {
  debug,
  loadJS,
  loadPackageJson,
  logger
} from '@planjs/react-cli-shared-utils'
import type { PackageJsonType } from '@planjs/react-cli-shared-utils'
import type { Configuration as WebpackOptions } from 'webpack'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'

import loadUserConfig from '../utils/loadUserConfig.js'
import resolveUserConfig from '../utils/resolveUserConfig.js'
import { isPlugin } from '../utils/plugin.js'
import type { ServicePlugin, UserConfig } from '../types'
import PluginApi from './PluginApi.js'

type PluginItem = {
  id: string
  apply: ServicePlugin
}

class Service {
  initialized = false
  context!: string
  pkgJson!: PackageJsonType & { react?: UserConfig }
  userOptions!: UserConfig
  plugins!: Array<PluginItem>
  webpackChainFns: Array<(config: ChainableWebpackConfig) => void> = []
  devServerConfigFns: Array<(config: WebpackDevServerOptions) => void> = []
  webpackRawConfigFns: Array<
    WebpackOptions | ((config: WebpackOptions) => WebpackOptions | void)
  > = []
  commands!: Record<
    string,
    {
      description?: string
      usage?: string
      options: Record<string, string>
      fn(args: minimist.ParsedArgs, rawArgv: string[]): void
    }
  >

  constructor(context: string) {
    this.context = context
    this.pkgJson = loadPackageJson(context)
    this.plugins = this.resolvePlugins()
  }

  async run(
    name: string,
    args: Record<string, any> = {},
    rawArgv: string[] = []
  ): Promise<void> {
    //
    await this.init()
  }

  async init(mode?: string): Promise<void> {
    mode = mode || process.env.REACT_CLI_MODE

    this.initialized = true

    // load base .env
    this.loadEnv()
    // load mode .env
    if (mode) {
      this.loadEnv(mode)
    }

    // load user options
    const userOptions = (this.userOptions = await this.loadUserOptions())

    // apply plugins
    this.plugins.forEach(({ id, apply }) => {
      apply(new PluginApi(id, this), userOptions)
    })

    if (userOptions.configureWebpack) {
      this.webpackRawConfigFns.push(userOptions.configureWebpack)
    }
  }

  resolveChainableWebpackConfig(): WebpackChain {
    const chainableConfig = new WebpackChain()
    this.webpackChainFns.forEach((fn) => fn(chainableConfig))
    return chainableConfig
  }

  resolveWebpackConfig(
    chainableConfig = this.resolveChainableWebpackConfig()
  ): WebpackOptions {
    if (!this.initialized) {
      throw new Error(
        'Service must call init() before calling resolveWebpackConfig().'
      )
    }
    // get raw config
    let config = chainableConfig.toConfig()

    // apply raw config fns
    this.webpackRawConfigFns.forEach((fn) => {
      if (typeof fn === 'function') {
        // function with optional return value
        const res = fn(config)
        if (res) config = merge(config, res)
      } else if (fn) {
        // merge literal values
        config = merge(config, fn)
      }
    })

    // check if the user has manually mutated output.publicPath
    const target = process.env.REACT_CLI_BUILD_TARGET
    if (
      !process.env.REACT_CLI_TEST &&
      target &&
      target !== 'app' &&
      config.output.publicPath !== this.userOptions.publicPath
    ) {
      throw new Error(
        `Do not modify webpack output.publicPath directly. ` +
          `Use the "publicPath" option in react.config.js instead.`
      )
    }

    if (
      !process.env.REACT_CLI_ENTRY_FILES &&
      typeof config.entry !== 'function'
    ) {
      let entryFiles: string[]
      if (typeof config.entry === 'string') {
        entryFiles = [config.entry]
      } else if (Array.isArray(config.entry)) {
        entryFiles = config.entry
      } else {
        entryFiles = Object.values(config.entry || []).reduce<string[]>(
          (allEntries, curr) => {
            return allEntries.concat(curr as string)
          },
          []
        )
      }

      entryFiles = entryFiles.map((file) => path.resolve(this.context, file))
      process.env.REACT_CLI_ENTRY_FILES = JSON.stringify(entryFiles)
    }

    return config
  }

  loadEnv(mode?: string): void {
    const debugLog = debug('vue:env')
    const basePath = path.resolve(this.context, `.env${mode ? `.${mode}` : ``}`)
    const localPath = `${basePath}.local`

    const load = (envPath: string) => {
      try {
        const env = dotenv.config({
          path: envPath,
          debug: !!process.env.DEBUG!
        })
        dotenvExpand(env)
        debugLog(envPath, env)
      } catch (err) {
        // only ignore error if file is not found
        if (err.toString().indexOf('ENOENT') < 0) {
          logger.error(err)
        }
      }
    }

    load(localPath)
    load(basePath)

    if (mode) {
      const shouldForceDefaultEnv =
        process.env.REACT_CLI_TEST && !process.env.REACT_CLI_TEST_TESTING_ENV
      const defaultNodeEnv =
        mode === 'production' || mode === 'test' ? mode : 'development'
      if (shouldForceDefaultEnv || process.env.NODE_ENV == null) {
        process.env.NODE_ENV = defaultNodeEnv
      }
      if (shouldForceDefaultEnv || process.env.BABEL_ENV == null) {
        process.env.BABEL_ENV = defaultNodeEnv
      }
    }
  }

  async loadUserOptions(): Promise<UserConfig> {
    const { fileConfigPath, fileConfig } = loadUserConfig(this.context)
    return await resolveUserConfig({
      fileConfigPath,
      fileConfig,
      pkgConfig: this.pkgJson.react
    })
  }

  resolvePlugins(): PluginItem[] {
    const idToPlugin = (id: string, absolutePath?: string) => ({
      id: id.replace(/^.\//, 'built-in:'),
      apply: loadJS(absolutePath || id, import.meta.url)
    })

    return Object.keys({
      ...this.pkgJson.dependencies,
      ...this.pkgJson.devDependencies
    })
      .filter(isPlugin)
      .map((id) => {
        if (
          this.pkgJson.optionalDependencies &&
          id in this.pkgJson.optionalDependencies
        ) {
          let apply = loadJS(id, import.meta.url)
          if (!apply) {
            logger.warn(`Optional dependency ${id} is not installed.`)
            apply = () => {}
          }

          return { id, apply }
        } else {
          return idToPlugin(id)
        }
      })
  }
}

export default Service
