import minimist from 'minimist'
import {
  checkNodeVersion,
  loadJSON,
  logger
} from '@planjs/react-cli-shared-utils'

import Service from './services/Service.js'

const { name, engines } = loadJSON('../package.json', import.meta.url)

checkNodeVersion(engines.node, name)

const service = new Service(process.env.REACT_CLI_CONTEXT || process.cwd())

const rawArgv = process.argv.slice(2)

const args = minimist(rawArgv, {
  boolean: [
    // serve
    'open',
    'copy',
    'https',
    // build
    'modern',
    'report',
    'report-json',
    'inline-react',
    'watch',
    // inspect
    'verbose'
  ]
})

const command = args._[0]

service.run(command, args, rawArgv).catch((err) => {
  console.log(err)
  logger.error(err)
  process.exit(1)
})
