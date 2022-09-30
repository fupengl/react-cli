import { loadModule } from '../src/index.js'

describe('@planjs/react-cli-shared-utils', () => {
  it('load esm local file', async () => {
    const result = await loadModule('./esm.js', import.meta.url)
    expect(result).toBe('esm')
  })

  it('load esm pkg', async () => {
    const result = await loadModule('chalk', import.meta.url)
    expect(typeof result.bgAnsi256).toBe('function')
  })
})
