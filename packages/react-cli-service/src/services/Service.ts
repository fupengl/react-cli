import path from 'node:path'
import dotenv from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'
import type minimist from "minimist";
import {
  debug,
  loadJS,
  loadPackageJson,
  logger
} from '@planjs/react-cli-shared-utils'
import type { PackageJsonType } from '@planjs/react-cli-shared-utils'

import loadUserConfig from '../utils/loadUserConfig'
import resolveUserConfig from '../utils/resolveUserConfig'
import { isPlugin } from '../utils/plugin'
import type { ServicePlugin, UserConfig } from '../types'

type PluginItem = {
  id: string
  apply: ServicePlugin
}

class Service {
  context!: string
  pkgJson!: PackageJsonType
  plugins!: Array<PluginItem>
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

  async init(mode?: string): Promise<void> {
    mode = mode || process.env.REACT_CLI_MODE

    // load base .env
    this.loadEnv()
    // load mode .env
    if (mode) {
      this.loadEnv(mode)
    }

    const userOptions = await this.loadUserOptions()

    console.log({ userOptions })
  }

  async run(
    name: string,
    args: Record<string, any> = {},
    rawArgv: string[] = []
  ): Promise<void> {
    //
    await this.init()
  }

  resolvePlugins(): PluginItem[] {
    const idToPlugin = (id: string, absolutePath?: string) => ({
      id: id.replace(/^.\//, 'built-in:'),
      apply: loadJS(absolutePath || id, import.meta.url)
    })

    return Object.keys(this.pkgJson.devDependencies || {})
      .concat(Object.keys(this.pkgJson.dependencies || {}))
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
      fileConfig
    })
  }
}

export default Service
