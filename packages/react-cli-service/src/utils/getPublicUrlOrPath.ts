import { URL } from 'node:url'

/**
 * Returns a URL or a path with slash at the end
 * In production can be URL, absolute path, relative path
 * In development always will be an absolute path
 * In development can use `path` module functions for operations
 *
 * @param {(string|undefined)} homepage a valid url or pathname
 * @param {(string|undefined)} envPublicUrl a valid url or pathname
 * @param {boolean|undefined}isEnvDevelopment
 * @returns {string}
 */
function getPublicUrlOrPath(
  homepage?: string,
  envPublicUrl?: string,
  isEnvDevelopment?: boolean
): string {
  const stubDomain = 'https://create-react-app.dev'

  if (envPublicUrl) {
    // ensure last slash exists
    envPublicUrl = envPublicUrl.endsWith('/')
      ? envPublicUrl
      : envPublicUrl + '/'

    const validPublicUrl = new URL(envPublicUrl, stubDomain)

    return isEnvDevelopment
      ? envPublicUrl.startsWith('.')
        ? '/'
        : validPublicUrl.pathname
      : // Some apps do not use client-side routing with pushState.
        // For these, "homepage" can be set to "." to enable relative asset paths.
        envPublicUrl
  }

  if (homepage) {
    // strip last slash if exists
    homepage = homepage.endsWith('/') ? homepage : homepage + '/'

    // validate if `homepage` is a URL or path like and use just pathname
    const validHomepagePathname = new URL(homepage, stubDomain).pathname
    return isEnvDevelopment
      ? homepage.startsWith('.')
        ? '/'
        : validHomepagePathname
      : // Some apps do not use client-side routing with pushState.
      // For these, "homepage" can be set to "." to enable relative asset paths.
      homepage.startsWith('.')
      ? homepage
      : validHomepagePathname
  }

  return '/'
}

export default getPublicUrlOrPath
