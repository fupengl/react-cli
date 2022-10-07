import { isFunction, isObject } from '@planjs/utils'

import { defaultOptions } from '../options.js'
import type { UserConfig } from '../types.js'

type UserConfigFNReturnType = UserConfig | Promise<UserConfig>
type DefineConfigReturnType = Promise<UserConfig | undefined>

function defineConfig(config: UserConfig): DefineConfigReturnType
function defineConfig(
  config: (config: UserConfig) => UserConfigFNReturnType
): DefineConfigReturnType
async function defineConfig(config: unknown): DefineConfigReturnType {
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
