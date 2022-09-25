import { createRequire } from 'node:module'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import type Config from 'webpack-chain'

import getCSSModuleLocalIdent from '../utils/getCSSModuleLocalIdent.js'
import type { ServicePlugin } from '../types.js'

const style: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.chainWebpack((config) => {
    const isEnvProduction = process.env.NODE_ENV === 'production'
    const isEnvDevelopment = process.env.NODE_ENV === 'development'
    const shouldUseSourceMap = options.productionSourceMap

    // optimization
    config.optimization.minimizer('css').use(CssMinimizerPlugin)

    // modules
    // style files regexes
    const cssRegex = /\.css$/
    const cssModuleRegex = /\.module\.css$/
    const sassRegex = /\.(scss|sass)$/
    const sassModuleRegex = /\.module\.(scss|sass)$/

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

      if (isEnvProduction) {
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
        .options(cssOptions)
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
                ]
          },
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment
        })
        .end()

      if (loader) {
        rule
          .use('resolve-url-loader')
          .loader(require.resolve('resolve-url-loader'))
          .options({
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
            root: api.resolve('src')
          })
          .end()

        rule
          .use(loader)
          .loader(require.resolve(loader))
          .options({
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment
          })
          .end()
      }

      return rule
    }

    createCSSRule('css', cssRegex, {
      importLoaders: 1,
      sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
      modules: {
        mode: 'icss'
      }
    }).set('sideEffects', true)

    createCSSRule('css-module', cssModuleRegex, {
      importLoaders: 1,
      sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
      modules: {
        mode: 'local',
        getLocalIdent: getCSSModuleLocalIdent
      }
    })

    createCSSRule(
      'sass',
      sassRegex,
      {
        importLoaders: 3,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'icss'
        }
      },
      'sass-loader'
    ).set('sideEffects', true)

    createCSSRule(
      'sass-module',
      sassModuleRegex,
      {
        importLoaders: 3,
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        modules: {
          mode: 'local',
          getLocalIdent: getCSSModuleLocalIdent
        }
      },
      'sass-loader'
    )
  })
}

export default style
