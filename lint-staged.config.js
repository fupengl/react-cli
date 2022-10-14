module.exports = {
  // Type check TypeScript files
  '**/*.(ts|tsx)': 'pnpm tsc --noEmit',

  // Sort package.json
  'package.json': 'pnpm sort-package-json',

  // Lint then format TypeScript and JavaScript files
  '**/*.(ts|tsx|js)': (filenames) => [
    `pnpm eslint --fix ${filenames.join(' ')}`,
    `git add ${filenames.join(' ')}`
  ],

  // Format MarkDown and JSON
  '**/*.(md|json)': (filenames) => [
    `pnpm prettier --write ${filenames.join(' ')}`,
    `git add ${filenames.join(' ')}`
  ]
}
