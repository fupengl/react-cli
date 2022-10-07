const pluginRE = /^(@planjs\/|react-|@[\w-]+(\.)?[\w-]+\/react-)cli-plugin-/
const scopeRE = /^@[\w-]+(\.)?[\w-]+\//

export const isPlugin = (id: string): boolean => {
  if (pluginRE.test(id)) return true

  if (id.charAt(0) === '@') {
    const scopeMatch = id.match(scopeRE)
    if (scopeMatch) {
      return pluginRE.test(id.replace(scopeRE, ''))
    }
  }

  return false
}

export const matchesPluginId = (input: string, full: string): boolean => {
  const short = full.replace(pluginRE, '')
  return (
    // input is full
    full === input ||
    // input is short without scope
    short === input ||
    // input is short with scope
    short === input.replace(scopeRE, '')
  )
}
