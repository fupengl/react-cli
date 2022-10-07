import readline from 'node:readline'
import stripAnsi from 'strip-ansi'
import chalk from 'chalk'

export class Logger {
  static format(label: string, msg: string): string {
    return msg
      .split('\n')
      .map((line, i) => {
        return i === 0
          ? `${label} ${line}`
          : line.padStart(stripAnsi(label).length + line.length + 1)
      })
      .join('\n')
  }

  static chalkTag(msg: string): string {
    return chalk.bgBlackBright.white.dim(` ${msg} `)
  }

  log(msg: any, tag?: string): void {
    tag
      ? console.log(Logger.format(Logger.chalkTag(tag), msg))
      : console.log(msg)
  }

  info(msg: any, tag?: string): void {
    console.log(
      Logger.format(
        chalk.bgBlue.black(' INFO ') + (tag ? Logger.chalkTag(tag) : ''),
        msg
      )
    )
  }

  done(msg: any, tag?: string): void {
    console.log(
      Logger.format(
        chalk.bgGreen.black(' DONE ') + (tag ? Logger.chalkTag(tag) : ''),
        msg
      )
    )
  }

  warn(msg: any, tag?: string): void {
    console.warn(
      Logger.format(
        chalk.bgYellow.black(' WARN ') + (tag ? Logger.chalkTag(tag) : ''),
        chalk.yellow(msg)
      )
    )
  }

  error(msg: any, tag?: string): void {
    console.error(
      Logger.format(
        chalk.bgRed(' ERROR ') + (tag ? Logger.chalkTag(tag) : ''),
        chalk.red(msg)
      )
    )
  }

  clearConsole(title: string): void {
    if (process.stdout.isTTY) {
      const blank = '\n'.repeat(process.stdout.rows)
      console.log(blank)
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)
      if (title) {
        console.log(title)
      }
    }
  }
}

const logger = new Logger()

export default logger
