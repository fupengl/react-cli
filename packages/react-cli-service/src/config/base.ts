import fs from 'node:fs'

import { getCurrentFileName } from '@planjs/react-cli-shared-utils'

import getClientEnvironment from '../utils/getClientEnvironment.js'
import { moduleFileExtensions } from '../constants/config.js'
import getModules from '../utils/modules.js'

import type { ServicePlugin } from '../types.js'

const base: ServicePlugin = (api, options) => {
  const env = getClientEnvironment(options.publicPath!)
  const isEnvProduction = process.env.NODE_ENV === 'production'

  api.chainWebpack((config) => {
    config.target('browserslist')
    config.stats('errors-warnings')
    config.set('infrastructureLogging', {
      level: 'none'
    })
    config.set('performance', false)

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

    // resolve
    config.resolve.extensions.clear()
    moduleFileExtensions.forEach((ext) => {
      const useTypescript = api.used.typescript()
      if ((!useTypescript && !ext.includes('ts')) || useTypescript) {
        config.resolve.extensions.add(`.${ext}`)
      }
    })
    const { additionalModulePaths, webpackAliases } = getModules(api)
    const isEnvProductionProfile =
      isEnvProduction && process.argv.includes('--profile')
    config.resolve.modules.merge(
      ['node_modules', api.resolve('node_modules')].concat(
        additionalModulePaths!
      ).filter(Boolean)
    )
    config.resolve.alias.merge({
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      'react-native': 'react-native-web',
      // Allows for better profiling with ReactDevTools
      ...(isEnvProductionProfile && {
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling'
      }),
      ...(webpackAliases || {})
    })
  })
}

export default base
