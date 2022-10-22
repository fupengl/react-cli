/**
 * @type {import('@planjs/react-cli-service').UserConfig}
 */
export default {
  outputDir: 'dist',
  pages: {
    index: 'src/index',
    about: 'src/about'
  },
  terser: {
    minify: 'esbuild'
  }
}
