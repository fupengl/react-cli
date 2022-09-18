import fs from 'node:fs'
import path from 'node:path'
import isFileEsm from 'is-file-esm'
import { loadJS } from '@planjs/react-cli-shared-utils'

function loadFileConfig<T = any>(
  context: string
): {
  fileConfig?: T
  fileConfigPath?: string
} {
  let fileConfig, fileConfigPath: string | undefined

  const possibleConfigPaths = [
    process.env.REACT_CLI_SERVICE_CONFIG_PATH,
    './react.config.js',
    './react.config.cjs',
    './react.config.mjs'
  ]

  for (const p of possibleConfigPaths) {
    const resolvedPath = p && path.resolve(context, p)
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      fileConfigPath = resolvedPath
      break
    }
  }

  if (fileConfigPath) {
    const { esm } = isFileEsm.sync(fileConfigPath)

    if (esm) {
      fileConfig = import(fileConfigPath)
    } else {
      fileConfig = loadJS(fileConfigPath, import.meta.url)
    }
  }

  return {
    fileConfig,
    fileConfigPath
  }
}

export default loadFileConfig
