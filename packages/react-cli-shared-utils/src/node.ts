import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import chalk from 'chalk'
import semver from 'semver'
import { readPackageSync } from 'read-pkg'
import isFileEsm from 'is-file-esm'
import resolve from 'resolve'

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
  let modulePath: string
  if (path.parse(id).ext === '') {
    modulePath = resolve.sync(id, {
      basedir: fileURLToPath(importMetaUrl)
    })
  } else {
    modulePath = fileURLToPath(new URL(id, importMetaUrl))
  }
  const { esm } = isFileEsm.sync(modulePath)
  let result
  if (esm) {
    result = (await import(modulePath)).default
  } else {
    result = useRequire(id, importMetaUrl)
  }
  return result
}

export function getCurrentFileName(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl)
}

export function getCurrentDirName(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl))
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
