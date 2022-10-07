import path from 'node:path'
import { chalk } from '@planjs/react-cli-shared-utils'
import stripAnsi from 'strip-ansi'
import table from 'text-table'

function isError(message) {
  if (message.fatal || message.severity === 2) {
    return true
  }
  return false
}

/**
 * @param api {PluginApi}
 * @return {function(*): string}
 */
function getFormatter(api) {
  const cwd = api.service.context

  const emitErrorsAsWarnings =
    process.env.NODE_ENV === 'development' &&
    process.env.ESLINT_NO_DEV_ERRORS === 'true'

  function getRelativePath(filePath) {
    return path.relative(cwd, filePath)
  }

  return function formatter(results) {
    let output = '\n'
    let hasErrors = false
    let reportContainsErrorRuleIDs = false

    results.forEach((result) => {
      let messages = result.messages
      if (messages.length === 0) {
        return
      }

      messages = messages.map((message) => {
        let messageType
        if (isError(message) && !emitErrorsAsWarnings) {
          messageType = 'error'
          hasErrors = true
          if (message.ruleId) {
            reportContainsErrorRuleIDs = true
          }
        } else {
          messageType = 'warn'
        }

        let line = message.line || 0
        if (message.column) {
          line += ':' + message.column
        }
        const position = chalk.bold('Line ' + line + ':')
        return [
          '',
          position,
          messageType,
          message.message.replace(/\.$/, ''),
          chalk.underline(message.ruleId || '')
        ]
      })

      // if there are error messages, we want to show only errors
      if (hasErrors) {
        messages = messages.filter((m) => m[2] === 'error')
      }

      // add color to rule keywords
      messages.forEach((m) => {
        m[4] = m[2] === 'error' ? chalk.red(m[4]) : chalk.yellow(m[4])
        m.splice(2, 1)
      })

      const outputTable = table(messages, {
        align: ['l', 'l', 'l'],
        stringLength(str) {
          return stripAnsi(str).length
        }
      })

      // print the filename and relative path
      output += `${getRelativePath(result.filePath)}\n`

      // print the errors
      output += `${outputTable}\n\n`
    })

    if (reportContainsErrorRuleIDs) {
      // Unlike with warnings, we have to do it here.
      // We have similar code in react-cli-service for warnings,
      // but warnings can appear in multiple files so we only
      // print it once at the end. For errors, however, we print
      // it here because we always show at most one error, and
      // we can only be sure it's an ESLint error before exiting
      // this function.
      output +=
        'Search for the ' +
        chalk.underline(chalk.red('keywords')) +
        ' to learn more about each error.'
    }

    return output
  }
}

export default getFormatter
