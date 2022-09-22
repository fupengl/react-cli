describe('@planjs/react-cli-service', () => {
  it('cli-service', async () => {
    await expect(import('../src/cli')).resolves.not.toThrow()
  })
})
