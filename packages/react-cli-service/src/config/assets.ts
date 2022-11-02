import { createRequire } from 'node:module'

import tryPrefixPath from '../utils/tryPrefixPath.js'
import type { ServicePlugin } from '../types.js'

const assets: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack((config) => {
    const imageInlineSizeLimit = parseInt(
      process.env.IMAGE_INLINE_SIZE_LIMIT || '10000'
    )

    config.module
      .rule('oneOf')
      .oneOf('avif')
      .test(/\.avif$/)
      .set('type', 'asset')
      .set('mimetype', 'image/avif')
      .parser({
        dataUrlCondition: {
          maxSize: imageInlineSizeLimit
        }
      })
      .end()

    // "url" loader works like "file" loader except that it embeds assets
    // smaller than specified limit in bytes as data URLs to avoid requests.
    // A missing `test` is equivalent to a match.
    config.module
      .rule('oneOf')
      .oneOf('img')
      .test([/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/])
      .set('type', 'asset')
      .parser({
        dataUrlCondition: {
          maxSize: imageInlineSizeLimit
        }
      })
      .end()

    config.module
      .rule('oneOf')
      .oneOf('svg')
      .test(/\.svg$/)
      .use('@svgr/webpack')
      .loader(require.resolve('@svgr/webpack'))
      .options({
        prettier: false,
        svgo: false,
        svgoConfig: {
          plugins: [{ removeViewBox: false }]
        },
        titleProp: true,
        ref: true
      })
      .end()
      .use('file-loader')
      .loader(require.resolve('file-loader'))
      .options({
        name: tryPrefixPath(
          `static/media/[name]${
            options.filenameHashing ? '.[hash:8]' : ''
          }.[ext]`,
          options.assetsDir
        )
      })
      .end()
      .set('issuer', {
        and: [/\.(ts|tsx|js|jsx|md|mdx)$/]
      })
  })
}

export default assets
