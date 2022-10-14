module.exports = {
  // Type check TypeScript files
  '**/*.(ts|tsx)': 'tsc --noEmit',

  // Sort package.json
  'package.json': 'sort-package-json',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|tsx|js)': [`eslint --fix`, `git add`],

  // Format MarkDown and JSON
  '**/*.(md|json)': [`prettier --write`, `git add`]
}
