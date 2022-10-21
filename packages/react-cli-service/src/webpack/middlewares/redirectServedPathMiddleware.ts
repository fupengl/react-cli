import path from 'node:path'
import type { RequestHandler } from 'express'

function createRedirectServedPathMiddleware(
  servedPath: string
): RequestHandler {
  servedPath = servedPath.slice(0, -1)
  return function redirectServedPathMiddleware(req, res, next) {
    if (
      servedPath === '' ||
      req.url === servedPath ||
      req.url.startsWith(servedPath)
    ) {
      next()
    } else {
      const newPath = path.join(servedPath, req.path !== '/' ? req.path : '')
      res.redirect(newPath)
    }
  }
}

export default createRedirectServedPathMiddleware
