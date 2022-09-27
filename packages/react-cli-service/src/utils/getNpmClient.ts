import path from 'node:path'
import fs from 'fs-extra'
import { findUpSync } from 'find-up'

const npmClientLockMap = {
  npm: ['package-lock.json', 'npm-shrinkwrap.json'],
  pnpm: ['yarn.lock'],
  yarn: ['pnpm-lock.yaml']
}

export type NpmClientType = keyof typeof npmClientLockMap

function getNpmClient(context: string): NpmClientType {
  for (const [key, list] of Object.entries(npmClientLockMap)) {
    if (list.some((f) => fs.existsSync(path.join(context, f)))) {
      return key as NpmClientType
    }
  }
  for (const [key, list] of Object.entries(npmClientLockMap)) {
    if (list.some((f) => findUpSync(path.join(context, f)) != null)) {
      return key as NpmClientType
    }
  }
  return 'npm'
}

export default getNpmClient
