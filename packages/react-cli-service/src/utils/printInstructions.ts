import { chalk } from '@planjs/react-cli-shared-utils'

import type formatDevUrl from './formatDevUrl.js'
import type { NpmClientType } from './getNpmClient.js'

function printInstructions(
  appName: string,
  urls: ReturnType<typeof formatDevUrl>,
  npmClient: NpmClientType,
  copy?: boolean
): void {
  console.log()
  console.log(`You can now view ${chalk.bold(appName)} in the browser.`)
  console.log()

  if (urls.lanUrlForTerminal) {
    console.log(
      `  ${chalk.bold('Local:')}            ${urls.localUrlForTerminal}${
        copy ? chalk.dim(' (copied to clipboard)') : ''
      }`
    )
    console.log(
      `  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}`
    )
  } else {
    console.log(`  ${urls.localUrlForTerminal}`)
  }

  const likeYarn = npmClient !== 'npm'

  console.log()
  console.log('Note that the development build is not optimized.')
  console.log(
    `To create a production build, use ` +
      `${chalk.cyan(`${likeYarn ? npmClient : 'npm run'} build`)}.`
  )
  console.log()
}

export default printInstructions
