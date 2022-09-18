import { isFunction, isObject } from '@planjs/utils'

import { defaultOptions } from '../options'
import type { UserConfig } from '../types'

type UserConfigReturnType = UserConfig | Promise<UserConfig>

function defineConfig(config: UserConfig): Promise<UserConfig>
function defineConfig(
  config: (config: UserConfig) => UserConfigReturnType
): Promise<UserConfig>
async function defineConfig(config: unknown): Promise<UserConfig> {
  let result
  if (isFunction(config)) {
    result = config(defaultOptions)
  }
  if (isObject(config)) {
    result = config
  }
  return result
}

export default defineConfig
