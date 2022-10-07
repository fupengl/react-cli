import { program } from 'commander'
import envInfo from 'envinfo'

import {
  chalk,
  checkNodeVersion,
  loadJSON
} from '@planjs/react-cli-shared-utils'

const { name, version, engines } = loadJSON('../package.json', import.meta.url)

checkNodeVersion(engines.node, name)

program.version(`${name} ${version}`).usage('<command> [options]')

program
  .command('start')
  .description('alias of "npm run start" in the current project')
  .allowUnknownOption()
  .action(() => {})

program
  .command('build')
  .description('alias of "npm run build" in the current project')
  .action((cmd) => {})

program
  .command('info')
  .description('print debugging information about your environment')
  .action((cmd) => {
    console.log(chalk.bold('\nEnvironment Info:'))
    envInfo
      .run(
        {
          System: ['OS', 'CPU'],
          Binaries: ['Node', 'Yarn', 'npm'],
          Browsers: ['Chrome', 'Edge', 'Firefox', 'Safari'],
          npmPackages: '/**/{typescript,*react-cli*,@planjs/*/}',
          npmGlobalPackages: ['@planjs/react-cli']
        },
        {
          showNotFound: true,
          duplicates: true,
          fullTree: true
        }
      )
      .then(console.log)
  })

program.parse(process.argv)
