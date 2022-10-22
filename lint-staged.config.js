module.exports = {
  // Type check TypeScript files
  '**/*.(ts|tsx)': () => ['pnpm tsc --noEmit'],

  // Sort package.json
  'package.json': 'pnpm sort-package-json',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|tsx|js)': [`pnpm eslint --fix`, `git add`],

  // Format MarkDown and JSON
  '**/*.(md|json)': [`pnpm prettier --write`, `git add`]
}
