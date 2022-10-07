import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'

import type { ServicePlugin } from '../types.js'

const dev: ServicePlugin = (api, options) => {
  api.chainWebpack((config) => {
    const isEnvDevelopment = process.env.NODE_ENV === 'development'

    if (isEnvDevelopment) {
      // Experimental hot reloading for React .
      // https://github.com/facebook/react/tree/main/packages/react-refresh
      options.fastRefresh &&
        config
          .plugin('ReactRefreshWebpackPlugin')
          .use(ReactRefreshWebpackPlugin, [{ overlay: false }])

      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      config.plugin('CaseSensitivePathsPlugin').use(CaseSensitivePathsPlugin)
    }
  })
}

export default dev
