export const exitProcess =
  !process.env.REACT_CLI_API_MODE && !process.env.REACT_CLI_TEST

function exit(code: number): void {
  if (exitProcess) {
    process.exit(code)
  } else if (code > 0) {
    throw new Error(`Process exited with code ${code}`)
  }
}

export default exit
