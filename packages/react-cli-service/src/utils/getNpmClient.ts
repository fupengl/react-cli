import { findUpSync } from 'find-up'

const npmClientLockMap = {
  npm: ['package-lock.json', 'npm-shrinkwrap.json'],
  yarn: ['yarn.lock'],
  pnpm: ['pnpm-lock.yaml']
}

export type NpmClientType = keyof typeof npmClientLockMap

function getNpmClient(context: string): NpmClientType {
  for (const [key, list] of Object.entries(npmClientLockMap)) {
    if (findUpSync(list, { cwd: context })) {
      return key as NpmClientType
    }
  }
  return 'npm'
}

export default getNpmClient
