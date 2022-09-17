import { checkNodeVersion, loadJSON } from '@planjs/react-cli-shared-utils'

const { name, engines } = loadJSON('../package.json', import.meta.url)

checkNodeVersion(engines.node, name)
