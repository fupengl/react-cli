import escapeStringRegexp from 'escape-string-regexp'
/**
 * link https://github1s.com/facebook/create-react-app/blob/HEAD/packages/react-dev-utils/InterpolateHtmlPlugin.js
 */
class InterpolateHtmlPlugin {
  /**
   * @param htmlWebpackPlugin {typeof import('html-webpack-plugin')}
   * @param replacements {object}
   */
  constructor(htmlWebpackPlugin, replacements) {
    this.htmlWebpackPlugin = htmlWebpackPlugin;
    this.replacements = replacements;
  }

  /**
   * @param compiler {import('webpack').Compiler}
   */
  apply(compiler) {
    compiler.hooks.compilation.tap('InterpolateHtmlPlugin', compilation => {
      this.htmlWebpackPlugin
        .getHooks(compilation)
        .afterTemplateExecution.tap('InterpolateHtmlPlugin', data => {
        // Run HTML through a series of user-specified string replacements.
        Object.keys(this.replacements).forEach(key => {
          const value = this.replacements[key];
          data.html = data.html.replace(
            new RegExp('%' + escapeStringRegexp(key) + '%', 'g'),
            value
          );
        });
      });
    });
  }
}

export default InterpolateHtmlPlugin
