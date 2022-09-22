import { loadJSON } from '@planjs/react-cli-shared-utils'
import type { ServicePlugin } from '../types'

const test: ServicePlugin = (api, options) => {
  api.registerCommand(
    'version',
    {
      description: 'cli version'
    },
    () => {
      console.log(loadJSON('../../package.json', import.meta.url).version)
    }
  )
}

export default test
