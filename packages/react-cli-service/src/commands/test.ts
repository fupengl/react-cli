import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import jest from 'jest'
import { getCurrentDirName, resolve } from '@planjs/react-cli-shared-utils'
import defaultsDeep from 'lodash.defaultsdeep'

import type { ServicePlugin } from '../types.js'
import resolveFilePath from '../utils/resolveFilePath.js'
import { moduleFileExtensions } from '../constants/config.js'
import getModules from '../utils/modules.js'

const test: ServicePlugin = (api, options) => {
  const require = createRequire(import.meta.url)

  api.registerCommand(
    'test',
    {
      description: 'start development server',
      usage: 'react-cli-service serve [options] [entry]',
      options: {}
    },
    async (_, rawArgv) => {
      process.env.BABEL_ENV = 'test'
      process.env.NODE_ENV = 'test'
      process.env.PUBLIC_URL = ''

      const jestArgs: string[] = []

      if (
        !process.env.CI &&
        rawArgv.indexOf('--watchAll') === -1 &&
        rawArgv.indexOf('--watchAll=false') === -1
      ) {
        jestArgs.push('--watch')
      }

      const setupTestsFilePath = resolveFilePath(api.resolve('src/setupTests'))
      const setupTestsMatches = setupTestsFilePath.match(
        /src[/\\]setupTests\.(.+)/
      )
      const setupTestsFileExtension =
        (setupTestsMatches && setupTestsMatches[1]) || 'js'
      const setupTestsFile = fs.existsSync(setupTestsFilePath)
        ? `<rootDir>/src/setupTests.${setupTestsFileExtension}`
        : undefined

      const { additionalModulePaths, jestAliases } = getModules(api)

      let jestConfig = {
        roots: ['<rootDir>/src'],

        collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts'],

        setupFiles: [require.resolve('react-app-polyfill/jsdom')],

        setupFilesAfterEnv: setupTestsFile ? [setupTestsFile] : [],
        testMatch: [
          '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
          '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}'
        ],
        testEnvironment: 'jsdom',
        transform: {
          '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': require.resolve(
            '../../jest/babelTransform.cjs'
          ),
          '^.+\\.css$': require.resolve('../../jest/cssTransform.cjs'),
          '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': require.resolve(
            '../../jest/fileTransform.cjs'
          )
        },
        transformIgnorePatterns: [
          '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
          '^.+\\.module\\.(css|sass|scss)$'
        ],
        modulePaths: additionalModulePaths || [],
        moduleNameMapper: {
          '^react-native$': 'react-native-web',
          '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
          ...(jestAliases || {})
        },
        moduleFileExtensions: [...moduleFileExtensions, 'node'].filter(
          (ext) => !ext.includes('mjs')
        ),
        watchPlugins: [
          'jest-watch-typeahead/filename',
          'jest-watch-typeahead/testname'
        ],
        resetMocks: true
      }

      if (api.service.packageJson.jest) {
        jestConfig = defaultsDeep(jestConfig, api.service.packageJson.jest)
      }

      const jestConfigPath = api.used.jestConfig()
      if (jestConfig) {
        jestArgs.push('--config', jestConfigPath!)
      } else {
        jestArgs.push('--config', JSON.stringify(jestConfig))
      }

      const argv = []
      let env: string = 'jsdom'
      let next
      do {
        next = jestArgs.shift()!
        if (next === '--env') {
          env = jestArgs.shift()!
        } else if (next.indexOf('--env=') === 0) {
          env = next.substring('--env='.length)
        } else {
          argv.push(next)
        }
      } while (jestArgs.length > 0)

      let resolvedEnv
      try {
        resolvedEnv = resolveJestDefaultEnvironment(`jest-environment-${env}`)
      } catch (e) {}
      if (!resolvedEnv) {
        try {
          resolvedEnv = resolveJestDefaultEnvironment(env)
        } catch (e) {}
      }

      const testEnvironment = resolvedEnv || env
      argv.push('--env', testEnvironment)

      await jest.run(argv)
    }
  )
}

function resolveJestDefaultEnvironment(name: string) {
  const jestDir = path.dirname(
    resolve.sync('jest', {
      basedir: getCurrentDirName(import.meta.url)
    })
  )
  const jestCLIDir = path.dirname(
    resolve.sync('jest-cli', {
      basedir: jestDir
    })
  )
  const jestConfigDir = path.dirname(
    resolve.sync('jest-config', {
      basedir: jestCLIDir
    })
  )
  return resolve.sync(name, {
    basedir: jestConfigDir
  })
}

export default test
