import { chalk, logger, validate } from '@planjs/react-cli-shared-utils'
import { schema } from '../options'
import type { UserConfig } from '../types'
import defineConfig from './defineConfig'

type ResolveUserConfigParams = {
  fileConfig?: any
  fileConfigPath?: string
}

async function resolveUserConfig({
  fileConfig,
  fileConfigPath
}: ResolveUserConfigParams): Promise<UserConfig> {
  const config = defineConfig(fileConfig)

  // validate options
  validate(config, schema, (msg) => {
    logger.error(`Invalid options in ${chalk.bold(fileConfigPath)}: ${msg}`)
  })

  return config
}

export default resolveUserConfig
