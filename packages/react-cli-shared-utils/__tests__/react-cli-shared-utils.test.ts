import { loadModule } from '../src/index.js'

describe('@planjs/react-cli-shared-utils', () => {
  it('load esm module', async () => {
    const result = await loadModule('./esm.js', import.meta.url)
    expect(result).toBe('esm')
  })
})
