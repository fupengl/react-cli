describe('@planjs/react-cli-service', () => {
  it('cli-service', async () => {
    await expect(import('../src/cli.js')).resolves.not.toThrow()
  })
})
