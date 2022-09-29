import { execFileSync, execSync } from 'node:child_process'
import type { ExecSyncOptionsWithStringEncoding } from 'node:child_process'
import chalk from 'chalk'

const execOptions: ExecSyncOptionsWithStringEncoding = {
  encoding: 'utf8',
  stdio: [
    'pipe', // stdin (default)
    'pipe', // stdout (default)
    'ignore' //stderr
  ]
}

function getProcessIdOnPort(port: number): string {
  return execFileSync(
    'lsof',
    ['-i:' + port, '-P', '-t', '-sTCP:LISTEN'],
    execOptions
  )
    .split('\n')[0]
    .trim()
}

function getProcessCommand(processId: string, processDirectory: string) {
  let command = execSync(
    'ps -o command -p ' + processId + ' | sed -n 2p',
    execOptions
  )

  command = command.replace(/\n$/, '')

  return command
}

function getDirectoryOfProcessById(processId: string) {
  return execSync(
    'lsof -p ' +
      processId +
      ' | awk \'$4=="cwd" {for (i=9; i<=NF; i++) printf "%s ", $i}\'',
    execOptions
  ).trim()
}

function getProcessForPort(port: number): string | null {
  try {
    const processId = getProcessIdOnPort(port)
    const directory = getDirectoryOfProcessById(processId)
    const command = getProcessCommand(processId, directory)
    return (
      chalk.cyan(command) +
      chalk.grey(' (pid ' + processId + ')\n') +
      chalk.blue('  in ') +
      chalk.cyan(directory)
    )
  } catch (e) {
    return null
  }
}

export default getProcessForPort
