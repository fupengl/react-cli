import { createRequire } from 'node:module'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import type Config from 'webpack-chain'

import getCSSModuleLocalIdent from '../utils/getCSSModuleLocalIdent.js'
import type { ServicePlugin } from '../types.js'
import tryPrefixPath from '../utils/tryPrefixPath.js'

const style: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack((config) => {
    const isEnvProduction = process.env.NODE_ENV === 'production'
    const isEnvDevelopment = process.env.NODE_ENV === 'development'
    const shouldUseSourceMap = options.productionSourceMap

    const {
      extract = isEnvProduction,
      sourceMap = isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
      loaderOptions = {}
    } = options.css || {}

    // optimization
    config.optimization.minimizer('css').use(CssMinimizerPlugin)

    function createCSSRule(
      lang: string,
      test: RegExp,
      cssOptions?: any,
      loader?: string
    ): Config.Rule<Config.Rule<Config.Module>> {
      const rule = config.module.rule('oneOf').oneOf(lang).test(test)

      if (isEnvDevelopment) {
        rule.use('style-loader').loader(require.resolve('style-loader')).end()
      }

      if (extract) {
        // css is located in `static/css`, use '../../' to locate index.html folder
        // in production `paths.publicUrlOrPath` can be a relative path
        rule
          .use('mini-css-extract-loader')
          .loader(MiniCssExtractPlugin.loader)
          .options(
            options.publicPath!.startsWith('.')
              ? {}
              : {
                  publicPath: '../../'
                }
          )
          .end()
      }

      rule
        .use('css-loader')
        .loader(require.resolve('css-loader'))
        .options({
          ...cssOptions,
          ...loaderOptions?.css
        })
        .end()

      rule
        .use('postcss-loader')
        .loader(require.resolve('postcss-loader'))
        .options({
          postcssOptions: {
            // Necessary for external CSS imports to work
            // https://github.com/facebook/create-react-app/issues/2677
            ident: 'postcss',
            config: true,
            plugins: !api.used.tailwind()
              ? [
                  require.resolve('postcss-flexbugs-fixes'),
                  [
                    require.resolve('postcss-preset-env'),
                    {
                      autoprefixer: {
                        flexbox: 'no-2009'
                      },
                      stage: 3
                    }
                  ],
                  // Adds PostCSS Normalize as the reset css with default options,
                  // so that it honors browserslist config in package.json
                  // which in turn let's users customize the target behavior as per their needs.
                  require.resolve('postcss-normalize')
                ]
              : [
                  require.resolve('tailwindcss'),
                  require.resolve('postcss-flexbugs-fixes'),
                  [
                    require.resolve('postcss-preset-env'),
                    {
                      autoprefixer: {
                        flexbox: 'no-2009'
                      },
                      stage: 3
                    }
                  ]
                ],
            ...loaderOptions?.postcss
          },
          sourceMap
        })
        .end()

      if (loader) {
        rule
          .use('resolve-url-loader')
          .loader(require.resolve('resolve-url-loader'))
          .options({
            sourceMap,
            root: api.resolve('src')
          })
          .end()

        rule
          .use(loader)
          .loader(loader)
          .options({
            // @ts-ignore
            ...loaderOptions?.[lang],
            sourceMap: true,
          })
          .end()
      }

      return rule
    }

    createCSSRule('css', /\.css$/, {
      importLoaders: 1,
      sourceMap,
      modules: {
        mode: 'icss'
      }
    })
      .set('sideEffects', true)
      .exclude.add(/\.module\.css$/)
      .end()

    createCSSRule('css-module', /\.module\.css$/, {
      importLoaders: 1,
      sourceMap,
      modules: {
        mode: 'local',
        getLocalIdent: getCSSModuleLocalIdent
      }
    })

    createCSSRule(
      'sass',
      /\.(scss|sass)$/,
      {
        importLoaders: 3,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'icss'
        }
      },
      'sass-loader'
    )
      .set('sideEffects', true)
      .exclude.add(/\.module\.(scss|sass)$/)
      .end()

    createCSSRule(
      'sass-module',
      /\.module\.(scss|sass)$/,
      {
        importLoaders: 3,
        sourceMap,
        modules: {
          mode: 'local',
          getLocalIdent: getCSSModuleLocalIdent
        }
      },
      'sass-loader'
    )

    createCSSRule(
      'less',
      /\.less$/,
      {
        importLoaders: 3,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'icss'
        }
      },
      'less-loader'
    )
      .set('sideEffects', true)
      .exclude.add(/\.module\.less$/)
      .end()

    createCSSRule(
      'less-module',
      /\.module\.less$/,
      {
        importLoaders: 3,
        sourceMap,
        modules: {
          mode: 'local',
          getLocalIdent: getCSSModuleLocalIdent
        }
      },
      'less-loader'
    )

    createCSSRule(
      'stylus',
      /\.styl(us)?$/,
      {
        importLoaders: 3,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'icss'
        }
      },
      'stylus-loader'
    )
      .set('sideEffects', true)
      .exclude.add(/\.module\.styl(us)?$/)
      .end()

    createCSSRule(
      'stylus-module',
      /\.module\.styl(us)?$/,
      {
        importLoaders: 3,
        sourceMap,
        modules: {
          mode: 'local',
          getLocalIdent: getCSSModuleLocalIdent
        }
      },
      'stylus-loader'
    )

    // "file" loader makes sure those assets get served by WebpackDevServer.
    // When you `import` an asset, you get its (virtual) filename.
    // In production, they would get copied to the `build` folder.
    // This loader doesn't use a "test" so it will catch all modules
    // that fall through the other loaders.
    config.module
      .rule('oneOf')
      .oneOf('exclude-assets')
      .exclude.merge([/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/])
      .end()
      .set('type', 'asset/resource')

    if (extract) {
      config.plugin('MiniCssExtractPlugin').use(MiniCssExtractPlugin, [
        {
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: tryPrefixPath(
            `static/css/[name]${
              options.filenameHashing ? '.[contenthash:8]' : ''
            }.css`,
            options.assetsDir
          ),
          chunkFilename: tryPrefixPath(
            `static/css/[name]${
              options.filenameHashing ? '.[contenthash:8]' : ''
            }.chunk.css`,
            options.assetsDir
          ),
          ...(typeof extract === 'object' ? extract : {})
        }
      ])
    }
  })
}

export default style
