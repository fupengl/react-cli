import url from 'node:url'
import fs from 'node:fs'
import type { PackageJsonType } from '@planjs/react-cli-shared-utils'
import { chalk } from '@planjs/react-cli-shared-utils'
import globalModules from 'global-modules'

import type { NpmClientType } from './getNpmClient.js'

function printHostingInstructions(
  appPackage: PackageJsonType,
  publicUrl: string,
  publicPath: string,
  buildFolder: string,
  npmClient: NpmClientType
): void {
  if (publicUrl && publicUrl.includes('.github.io/')) {
    // "homepage": "http://user.github.io/project"
    const publicPathname = url.parse(publicPath).pathname!
    const hasDeployScript =
      typeof appPackage.scripts !== 'undefined' &&
      typeof appPackage.scripts.deploy !== 'undefined'
    printBaseMessage(buildFolder, publicPathname)

    printDeployInstructions(publicUrl, hasDeployScript, npmClient)
  } else if (publicPath !== '/') {
    // "homepage": "http://mywebsite.com/project"
    printBaseMessage(buildFolder, publicPath)
  } else {
    // "homepage": "http://mywebsite.com"
    //   or no homepage
    printBaseMessage(buildFolder, publicUrl)

    printStaticServerInstructions(buildFolder, npmClient)
  }
  console.log()
  console.log('Find out more about deployment here:')
  console.log()
  console.log(`  ${chalk.yellow('https://cra.link/deployment')}`)
  console.log()
}

function printBaseMessage(buildFolder: string, hostingLocation: string) {
  console.log(
    `The project was built assuming it is hosted at ${chalk.green(
      hostingLocation || 'the server root'
    )}.`
  )
  console.log(
    `You can control this with the ${chalk.green(
      'homepage'
    )} field in your ${chalk.cyan('package.json')}.`
  )

  if (!hostingLocation) {
    console.log('For example, add this to build it for GitHub Pages:')
    console.log()

    console.log(
      `  ${chalk.green('"homepage"')} ${chalk.cyan(':')} ${chalk.green(
        '"http://myname.github.io/myapp"'
      )}${chalk.cyan(',')}`
    )
  }
  console.log()
  console.log(`The ${chalk.cyan(buildFolder)} folder is ready to be deployed.`)
}

function printDeployInstructions(
  publicUrl: string,
  hasDeployScript: boolean,
  npmClient: NpmClientType
) {
  console.log(`To publish it at ${chalk.green(publicUrl)} , run:`)
  console.log()

  const likeYarn = npmClient !== 'npm'
  // If script deploy has been added to package.json, skip the instructions
  if (!hasDeployScript) {
    if (likeYarn) {
      console.log(`  ${chalk.cyan(npmClient)} add --dev gh-pages`)
    } else {
      console.log(`  ${chalk.cyan(npmClient)} install --save-dev gh-pages`)
    }
    console.log()

    console.log(
      `Add the following script in your ${chalk.cyan('package.json')}.`
    )
    console.log()

    console.log(`    ${chalk.dim('// ...')}`)
    console.log(`    ${chalk.yellow('"scripts"')}: {`)
    console.log(`      ${chalk.dim('// ...')}`)
    console.log(
      `      ${chalk.yellow('"predeploy"')}: ${chalk.yellow(
        `"${likeYarn ? npmClient : 'npm run'} build",`
      )}`
    )
    console.log(
      `      ${chalk.yellow('"deploy"')}: ${chalk.yellow(
        '"gh-pages -d build"'
      )}`
    )
    console.log('    }')
    console.log()

    console.log('Then run:')
    console.log()
  }
  console.log(`  ${chalk.cyan(likeYarn ? npmClient : 'npm')} run deploy`)
}

function printStaticServerInstructions(
  buildFolder: string,
  npmClient: NpmClientType
) {
  console.log('You may serve it with a static server:')
  console.log()

  const likeYarn = npmClient !== 'npm'

  if (!fs.existsSync(`${globalModules}/serve`)) {
    if (likeYarn) {
      console.log(`  ${chalk.cyan(npmClient)} global add serve`)
    } else {
      console.log(`  ${chalk.cyan('npm')} install -g serve`)
    }
  }
  console.log(`  ${chalk.cyan('serve')} -s ${buildFolder}`)
}

export default printHostingInstructions
