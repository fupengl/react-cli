import { chalk, logger, validate } from '@planjs/react-cli-shared-utils'
import { isPlanObject } from '@planjs/utils'
import defaultsDeep from 'lodash.defaultsdeep'

import { defaultOptions, schema } from '../options.js'
import type { UserConfig } from '../types.js'
import defineConfig from './defineConfig.js'

type ResolveUserConfigParams = {
  fileConfig?: any
  fileConfigPath?: string
  pkgConfig?: UserConfig
}

async function resolveUserConfig({
  fileConfig,
  fileConfigPath,
  pkgConfig
}: ResolveUserConfigParams): Promise<UserConfig> {
  const config = await defineConfig(fileConfig)

  if (fileConfig && !isPlanObject(fileConfig)) {
    throw new Error(
      `Error loading ${chalk.bold(fileConfigPath)}: ` +
        `should export an object or a function that returns object.`
    )
  }

  if (pkgConfig && !isPlanObject(pkgConfig)) {
    throw new Error(
      `Error loading React CLI config in ${chalk.bold(`package.json`)}: ` +
        `the "react" field should be an object.`
    )
  }

  // validate options
  validate(config, schema, (msg) => {
    logger.error(`Invalid options in ${chalk.bold(fileConfigPath)}: ${msg}`)
  })

  return defaultsDeep(config, defaultOptions())
}

export default resolveUserConfig
