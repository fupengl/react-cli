import url from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'
import chalk from 'chalk'
import semver from 'semver'

export function loadJSON(filepath: string, importMetaUrl: string): any {
  const reg = /\S+.json$/g
  if (reg.test(filepath)) {
    const require = createRequire(importMetaUrl)
    return require(filepath)
  } else {
    throw new Error('loadJSON 的参数必须是一个json文件')
  }
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
