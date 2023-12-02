import detect from 'detect-port'
import isRoot from 'is-root'
import {
  chalk,
  clearConsole,
  getProcessForPort,
  logger,
  prompts
} from '@planjs/react-cli-shared-utils'

const isInteractive = process.stdout.isTTY

function choosePort(
  hostname: string,
  defaultPort: number
): Promise<number | null> {
  return detect({ port: defaultPort, hostname }).then(
    (port) =>
      new Promise((resolve) => {
        if (port === defaultPort) {
          return resolve(port)
        }
        if (port === undefined) {
          // https://github.com/node-modules/detect-port/blob/HEAD/lib/detect-port.js#L53-L54
          logger.error("The ip that is not unknown on the machine, please check hostname.")
          return resolve(null)
        }
        const message =
          process.platform !== 'win32' && defaultPort < 1024 && !isRoot()
            ? `Admin permissions are required to run a server on a port below 1024.`
            : `Something is already running on port ${defaultPort}.`
        if (isInteractive) {
          clearConsole()
          const existingProcess = getProcessForPort(defaultPort)
          const question: prompts.PromptObject<string> = {
            type: 'confirm',
            name: 'shouldChangePort',
            message:
              chalk.yellow(
                message +
                  `${existingProcess ? ` Probably:\n  ${existingProcess}` : ''}`
              ) + '\n\nWould you like to run the app on another port instead?',
            initial: true
          }
          prompts(question).then((answer) => {
            if (answer.shouldChangePort) {
              resolve(port)
            } else {
              resolve(null)
            }
          })
        } else {
          logger.error(message)
          resolve(null)
        }
      }),
    (err) => {
      throw new Error(
        chalk.red(`Could not find an open port at ${chalk.bold(hostname)}.`) +
          '\n' +
          ('Network error message: ' + err.message || err) +
          '\n'
      )
    }
  )
}

export default choosePort
