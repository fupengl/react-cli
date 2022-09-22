import fs from 'node:fs'

import { getCurrentFileName } from '@planjs/react-cli-shared-utils'

import getClientEnvironment from '../utils/getClientEnvironment.js'
import { moduleFileExtensions } from '../constants/config.js'

import type { ServicePlugin } from '../types'

const base: ServicePlugin = (api, options) => {
  const env = getClientEnvironment(options.publicPath!)

  api.chainWebpack((config) => {
    config.target('browserslist')
    config.stats('errors-warnings')
    config.set('infrastructureLogging', {
      level: 'none'
    })
    config.set('performance', false)
    config.resolve.extensions.clear()
    moduleFileExtensions.forEach((ext) => {
      const useTypescript = api.used.typescript()
      if ((!useTypescript && !ext.includes('ts')) || useTypescript) {
        config.resolve.extensions.add(`.${ext}`)
      }
    })

    const { cacheDirectory, cacheIdentifier } = api.getCacheIdentifier(
      'webpack',
      env.raw
    )
    config.cache({
      type: 'filesystem',
      version: cacheIdentifier,
      cacheDirectory: cacheDirectory,
      store: 'pack',
      buildDependencies: {
        defaultWebpack: ['webpack/lib/'],
        config: [getCurrentFileName(import.meta.url)],
        tsconfig: ['tsconfig.json', 'jsconfig.json'].filter((f) =>
          fs.existsSync(api.resolve(f))
        )
      }
    })
  })
}

export default base
