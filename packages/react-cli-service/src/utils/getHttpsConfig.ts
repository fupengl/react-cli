import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import { chalk } from '@planjs/react-cli-shared-utils'
import type { Configuration as WebpackDevServerOptions } from 'webpack-dev-server'

function validateKeyAndCerts({
  cert,
  key,
  keyFile,
  crtFile
}: {
  cert: Buffer
  key: Buffer
  keyFile: string
  crtFile: string
}) {
  let encrypted
  try {
    encrypted = crypto.publicEncrypt(cert, Buffer.from('test'))
  } catch (err) {
    throw new Error(
      `The certificate "${chalk.yellow(crtFile)}" is invalid.\n${err.message}`
    )
  }

  try {
    crypto.privateDecrypt(key, encrypted)
  } catch (err) {
    throw new Error(
      `The certificate key "${chalk.yellow(keyFile)}" is invalid.\n${
        err.message
      }`
    )
  }
}

function readEnvFile(file: string, type: string): Buffer {
  if (!fs.existsSync(file)) {
    throw new Error(
      `You specified ${chalk.cyan(
        type
      )} in your env, but the file "${chalk.yellow(file)}" can't be found.`
    )
  }
  return fs.readFileSync(file)
}

function getHttpsConfig(context: string): WebpackDevServerOptions['https'] {
  const { SSL_CRT_FILE, SSL_KEY_FILE } = process.env

  if (SSL_CRT_FILE && SSL_KEY_FILE) {
    const crtFile = path.resolve(context, SSL_CRT_FILE)
    const keyFile = path.resolve(context, SSL_KEY_FILE)
    const config = {
      cert: readEnvFile(crtFile, 'SSL_CRT_FILE'),
      key: readEnvFile(keyFile, 'SSL_KEY_FILE')
    }

    validateKeyAndCerts({ ...config, keyFile, crtFile })
    return config
  }
  return true
}

export default getHttpsConfig
