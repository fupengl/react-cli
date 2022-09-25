import os from 'node:os'
import fs from 'node:fs'

import browserslist from 'browserslist'
import { chalk } from '@planjs/react-cli-shared-utils'
import prompts from 'prompts'
import { pkgUp } from 'pkg-up'

const defaultBrowsers = {
  production: ['>0.2%', 'not dead', 'not op_mini all'],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version'
  ]
}

export function shouldSetBrowsers(isInteractive: boolean): Promise<boolean> {
  if (!isInteractive) {
    return Promise.resolve(true)
  }

  const question: prompts.PromptObject = {
    type: 'confirm',
    name: 'shouldSetBrowsers',
    message:
      chalk.yellow("We're unable to detect target browsers.") +
      `\n\nWould you like to add the defaults to your ${chalk.bold(
        'package.json'
      )}?`,
    initial: true
  }

  return prompts(question).then((answer) => answer.shouldSetBrowsers)
}

export function checkBrowsers(
  dir: string,
  isInteractive: boolean,
  retry = true
): Promise<string[]> {
  const current = browserslist.loadConfig({ path: dir })
  if (current != null) {
    return Promise.resolve(current)
  }

  if (!retry) {
    return Promise.reject(
      new Error(
        chalk.red(
          'As of react-scripts >=2 you must specify targeted browsers.'
        ) +
          os.EOL +
          `Please add a ${chalk.underline(
            'browserslist'
          )} key to your ${chalk.bold('package.json')}.`
      )
    )
  }

  return shouldSetBrowsers(isInteractive).then((shouldSetBrowsers) => {
    if (!shouldSetBrowsers) {
      return checkBrowsers(dir, isInteractive, false)
    }

    return (
      pkgUp({ cwd: dir })
        .then((filePath) => {
          if (filePath == null) {
            return Promise.reject()
          }
          const pkg = JSON.parse(fs.readFileSync(filePath) as unknown as string)
          pkg['browserslist'] = defaultBrowsers
          fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + os.EOL)

          browserslist.clearCaches()
          console.log()
          console.log(
            `${chalk.green('Set target browsers:')} ${chalk.cyan(
              defaultBrowsers.production.join(', ')
            )}`
          )
          console.log()
        })
        // Swallow any error
        .catch(() => {})
        .then(() => checkBrowsers(dir, isInteractive, false))
    )
  })
}
