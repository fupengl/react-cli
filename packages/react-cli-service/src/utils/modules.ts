import fs from 'node:fs'
import path from 'node:path'
import resolve from 'resolve'
import { chalk } from '@planjs/react-cli-shared-utils'
import type { CompilerOptions } from 'typescript'

import type PluginApi from '../services/PluginApi.js'

function getModules(api: PluginApi) {
  // Check if TypeScript is setup
  const hasTsConfig = fs.existsSync(api.resolve('tsconfig.json'))
  const hasJsConfig = fs.existsSync(api.resolve('jsconfig.json'))

  const appNodeModules = api.resolve('node_modules')
  const appSrc = api.resolve('src')
  const appTsConfig = api.resolve('tsconfig.json')
  const appJsConfig = api.resolve('jsconfig.json')
  const appPath = api.service.context

  if (hasTsConfig && hasJsConfig) {
    throw new Error(
      'You have both a tsconfig.json and a jsconfig.json. If you are using TypeScript please remove your jsconfig.json file.'
    )
  }

  /**
   * Get additional module paths based on the baseUrl of a compilerOptions object.
   *
   * @param {Object} options
   */
  function getAdditionalModulePaths(options: CompilerOptions = {}) {
    const baseUrl = options.baseUrl!

    if (!baseUrl) {
      return ''
    }

    const baseUrlResolved = api.resolve(api.service.context, baseUrl)

    // We don't need to do anything if `baseUrl` is set to `node_modules`. This is
    // the default behavior.
    if (path.relative(appNodeModules, baseUrlResolved) === '') {
      return null
    }

    // Allow the user set the `baseUrl` to `appSrc`.
    if (path.relative(appSrc, baseUrlResolved) === '') {
      return [appSrc]
    }

    // If the path is equal to the root directory we ignore it here.
    // We don't want to allow importing from the root directly as source files are
    // not transpiled outside of `src`. We do allow importing them with the
    // absolute path (e.g. `src/Components/Button.js`) but we set that up with
    // an alias.
    if (path.relative(appPath, baseUrlResolved) === '') {
      return null
    }

    // Otherwise, throw an error.
    throw new Error(
      chalk.red.bold(
        "Your project's `baseUrl` can only be set to `src` or `node_modules`." +
          ' Create React App does not support other values at this time.'
      )
    )
  }

  /**
   * Get webpack aliases based on the baseUrl of a compilerOptions object.
   *
   * @param {*} options
   */
  function getWebpackAliases(options: CompilerOptions = {}) {
    const baseUrl = options.baseUrl

    if (!baseUrl) {
      return {}
    }

    const baseUrlResolved = path.resolve(appPath, baseUrl)

    if (path.relative(appPath, baseUrlResolved) === '') {
      return {
        src: appSrc
      }
    }
  }

  /**
   * Get jest aliases based on the baseUrl of a compilerOptions object.
   *
   * @param {*} options
   */
  function getJestAliases(options: CompilerOptions = {}) {
    const baseUrl = options.baseUrl

    if (!baseUrl) {
      return {}
    }

    const baseUrlResolved = path.resolve(appPath, baseUrl)

    if (path.relative(appPath, baseUrlResolved) === '') {
      return {
        '^src/(.*)$': '<rootDir>/src/$1'
      }
    }
  }

  let config

  // If there's a tsconfig.json we assume it's a
  // TypeScript project and set up the config
  // based on tsconfig.json
  if (hasTsConfig) {
    const ts = require(resolve.sync('typescript', {
      basedir: appNodeModules
    }))
    config = ts.readConfigFile(appTsConfig, ts.sys.readFile).config
    // Otherwise we'll check if there is jsconfig.json
    // for non TS projects.
  } else if (hasJsConfig) {
    config = require(appJsConfig)
  }

  config = config || {}
  const options = config.compilerOptions || {}

  const additionalModulePaths = getAdditionalModulePaths(options)

  return {
    additionalModulePaths: additionalModulePaths,
    webpackAliases: getWebpackAliases(options),
    jestAliases: getJestAliases(options),
    hasTsConfig
  }
}

export default getModules
