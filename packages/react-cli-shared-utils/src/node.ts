import url, { URL } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import chalk from 'chalk'
import semver from 'semver'
import { readPackageSync } from 'read-pkg'
import isFileEsm from 'is-file-esm'

export function loadJSON<T = any>(filepath: string, importMetaUrl: string): T {
  const reg = /\S+.json$/g
  if (reg.test(filepath)) {
    const require = createRequire(importMetaUrl)
    return require(filepath)
  } else {
    throw new Error('loadJSON 的参数必须是一个json文件')
  }
}

export function useRequire<T = any>(
  filepath: string,
  importMetaUrl: string
): T {
  const require = createRequire(importMetaUrl)
  return require(filepath)
}

export async function loadModule<T = any>(
  id: string,
  importMetaUrl: string
): Promise<T> {
  const moduleUrl = new URL(id, importMetaUrl)
  console.log(moduleUrl)
  const { esm } = isFileEsm.sync(moduleUrl.pathname)
  let result
  if (esm) {
    result = (await import(moduleUrl.pathname)).default
  } else {
    result = useRequire(id, importMetaUrl)
  }
  return result
}

export function getCurrentFileName(importMetaUrl: string): string {
  return url.fileURLToPath(importMetaUrl)
}

export function getCurrentDirName(importMetaUrl: string): string {
  return path.dirname(url.fileURLToPath(importMetaUrl))
}

/**
 * Check node version
 * @param wanted
 * @param id
 */
export function checkNodeVersion(wanted: string, id: string): void {
  if (!semver.satisfies(process.version, wanted, { includePrerelease: true })) {
    console.log(
      chalk.red(
        'You are using Node ' +
          process.version +
          ', but this version of ' +
          id +
          ' requires Node ' +
          wanted +
          '.\nPlease upgrade your Node version.'
      )
    )
    process.exit(1)
  }
}

export function loadPackageJson(
  context: string,
  normalize = false
): PackageJsonType {
  if (fs.existsSync(path.join(context, 'package.json'))) {
    return readPackageSync({ cwd: context, normalize })
  }
  return {}
}

export type PackageJsonType = ReturnType<typeof readPackageSync>
