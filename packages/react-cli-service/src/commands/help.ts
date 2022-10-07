import { chalk } from '@planjs/react-cli-shared-utils'

import type { ServicePlugin } from '../types.js'
import type { CommandItem } from '../services/Service.js'
import getPadLength from '../utils/getPadLength.js'

const help: ServicePlugin = (api, options) => {
  api.registerCommand('help', (args) => {
    const commandName = args._[0]
    if (!commandName) {
      logMainHelp()
    } else {
      logHelpForCommand(commandName, api.service.commands[commandName])
    }
  })

  function logMainHelp() {
    console.log(
      `\n  Usage: react-cli-service <command> [options]\n` + `\n  Commands:\n`
    )
    const commands = api.service.commands
    const padLength = getPadLength(commands)
    for (const name in commands) {
      if (name !== 'help') {
        const cmd = commands[name]
        console.log(
          `    ${chalk.blue(name.padEnd(padLength))}${cmd.description || ''}`
        )
      }
    }
    console.log(
      `\n  run ${chalk.green(
        `vue-cli-service help [command]`
      )} for usage of a specific command.\n`
    )
  }

  function logHelpForCommand(name: string, command: CommandItem) {
    if (!command) {
      console.log(chalk.red(`\n  command "${name}" does not exist.`))
    } else {
      if (command.usage) {
        console.log(`\n  Usage: ${command.usage}`)
      }
      if (command.options) {
        console.log(`\n  Options:\n`)
        const padLength = getPadLength(command.options)
        for (const [flags, description] of Object.entries(command.options)) {
          console.log(
            `    ${chalk.blue(flags.padEnd(padLength))}${description}`
          )
        }
      }
      if (command.details) {
        console.log()
        console.log(
          command.details
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n')
        )
      }
      console.log()
    }
  }
}

export default help
