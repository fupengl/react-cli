import getNpmClient from '../../src/utils/getNpmClient.js'

describe('getNpmClient', () => {
  it('get current project npm client', async () => {
    expect(getNpmClient(process.cwd())).toBe('pnpm')
  })
})
