import { tryCatch } from '@planjs/utils'
import { resolve } from '@planjs/react-cli-shared-utils'

import type PluginApi from '../services/PluginApi.js'

function checkPKGInstall(api: PluginApi, id: string): boolean {
  if (
    id in
    {
      ...api.service.packageJson.dependencies,
      ...api.service.packageJson.peerDependencies,
      ...api.service.packageJson.devDependencies
    }
  ) {
    return true
  }
  return tryCatch(
    () =>
      !!resolve.sync('typescript', {
        basedir: api.service.context
      }),
    () => false
  )()
}

export default checkPKGInstall
