import fs from 'node:fs'

import { moduleFileExtensions } from '../constants/config.js'

function resolveFilePath(filePath: string): string {
  const ext =
    moduleFileExtensions.find((extension) =>
      fs.existsSync(`${filePath}.${extension}`)
    ) || 'js'

  return `${filePath}.${ext}`
}

export default resolveFilePath
