import type Server from 'webpack-dev-server'
import type { RequestHandler } from 'express'
import type { Module } from 'webpack'

function base64SourceMap(
  source: ReturnType<typeof Module.prototype.originalSource>
) {
  const base64 = Buffer.from(JSON.stringify(source?.map()), 'utf8').toString(
    'base64'
  )
  return `data:application/json;charset=utf-8;base64,${base64}`
}

function getSourceById(server: Server, id: string) {
  // @ts-ignore
  const module = Array.from(server.stats.compilation.modules).find(
    // @ts-ignore
    // eslint-disable-next-line eqeqeq
    (m) => server.stats.compilation.chunkGraph.getModuleId(m) == id
  ) as Module
  return module.originalSource()
}

function createEvalSourceMapMiddleware(server: Server): RequestHandler {
  return function handleWebpackInternalMiddleware(req, res, next) {
    if (req.url.startsWith('/__get-internal-source')) {
      const fileName = req.query.fileName as string
      const id = fileName.match(/webpack-internal:\/\/\/(.+)/)![1]
      // @ts-ignore
      if (!id || !server.stats) {
        next()
      }

      const source = getSourceById(server, id)
      const sourceMapURL = `//# sourceMappingURL=${base64SourceMap(source)}`
      const sourceURL = `//# sourceURL=webpack-internal:///${module.id}`
      res.end(`${source?.source()}\n${sourceMapURL}\n${sourceURL}`)
    } else {
      next()
    }
  }
}

export default createEvalSourceMapMiddleware
