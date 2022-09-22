describe('@planjs/react-cli', () => {
  it('cli', async () => {
    await expect(import('../src/cli')).resolves.not.toThrow()
  })
})
