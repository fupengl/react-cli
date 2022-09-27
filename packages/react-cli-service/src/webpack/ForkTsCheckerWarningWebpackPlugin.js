import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

class ForkTsCheckerWarningWebpackPlugin {
  /**
   * @param compiler {import('webpack').Compiler}
   */
  apply(compiler) {
    new ForkTsCheckerWebpackPlugin().apply(compiler)

    const hooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler)

    hooks.issues.tap('ForkTsCheckerWarningWebpackPlugin', (issues) =>
      issues.map((issue) => ({ ...issue, severity: 'warning' }))
    )
  }
}

export default ForkTsCheckerWarningWebpackPlugin
