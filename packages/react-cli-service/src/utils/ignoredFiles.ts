import path from 'node:path'
import escape from 'escape-string-regexp'

function ignoredFiles(appSrc: string): RegExp {
  return new RegExp(
    `^(?!${escape(
      path.normalize(appSrc + '/').replace(/[\\]+/g, '/')
    )}).+/node_modules/`,
    'g'
  )
}

export default ignoredFiles
