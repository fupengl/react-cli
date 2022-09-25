import path from 'node:path'

function tryPrefixPath(p: string, prefix?: string): string {
  if (prefix) {
    return path.posix.join(prefix, p)
  }
  return p
}

export default tryPrefixPath
