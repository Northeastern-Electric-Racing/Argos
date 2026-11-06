// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
// ESM-only since 1.0, so require() returns the module namespace.
const rxjsAngularX = require('eslint-plugin-rxjs-angular-x').default;
// ESM, exported as module.exports, so require() returns the plugin itself.
const betterTailwind = require('eslint-plugin-better-tailwindcss');
const { getDefaultSelectors } = require('eslint-plugin-better-tailwindcss/defaults');
const fs = require('node:fs');
const path = require('node:path');

// Tailwind class linting (eslint-plugin-better-tailwindcss) reads the real theme from src/styles.css, so a
// class that names a missing token (text-gray-500, bg-accnt) is unknown. The recipe helper tw() is linted too.
const tailwindSettings = {
  'better-tailwindcss': {
    entryPoint: 'src/styles.css',
    tsconfig: 'tsconfig.json',
    selectors: [...getDefaultSelectors(), { kind: 'callee', name: '^tw$', match: [{ type: 'strings' }] }]
  }
};

// Classes the spike bans.
const restrictedClasses = [
  { pattern: '^(.*:)?dark:.*$', message: 'The client is dark-only: never use the dark: variant.' },
  {
    pattern: '^.*-\\[(#|rgb|hsl|oklch|oklab|color-mix).*\\]$',
    message: 'Arbitrary colours bypass the AA-vetted tokens; use a theme colour.'
  },
  { pattern: '^(.*:)?text-[a-z][a-z0-9-]*/\\d+$', message: 'No opacity on text colour (it broke AA on #909); pick a text token.' },
  {
    pattern: '^(.*:)?(container|ring|filter)$',
    message: 'styles.css excludes these utilities (the scanner found them in prose); focus rings are focus-ring outlines.'
  },
  { pattern: '^(.*!|!.*)$', message: 'No important modifier: everything is in cascade layers, so order and specificity decide.' }
];

// A component is migrated once its stylesheet is gone (it is then all utilities), so unknown-class checks
// cover exactly those templates plus the recipes and atoms, and every slice's components join as it deletes
// their CSS. Templates that still have a stylesheet use their own class names, which Tailwind can't know.
const migratedFiles = fs
  .readdirSync(path.join(__dirname, 'src'), { recursive: true })
  .filter((f) => f.endsWith('.component.html') && !fs.existsSync(path.join(__dirname, 'src', f.replace(/\.html$/, '.css'))))
  .map((f) => path.join('src', f).split(path.sep).join('/'));

module.exports = tseslint.config(
  {
    ignores: [
      'projects/**/*',
      '**/.github/**',
      'build',
      'coverage',
      'docs',
      'lambda',
      'node_modules',
      'public',
      'lib',
      'dist',
      'generated',
      '.angular',
      '*.js'
    ]
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    plugins: {
      'rxjs-angular-x': rxjsAngularX
    },
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // angular-eslint now defaults the prefix to 'app'; selectors here have never used one
          prefix: '',
          style: 'kebab-case'
        }
      ],
      // Angular 22 defaults to OnPush; components pinned to Eager by the v22 migration keep their
      // old behaviour until they move to OnPush (#863).
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      'guard-for-in': 'error',
      'prefer-arrow-callback': 'error',
      'no-unsafe-negation': ['error', { enforceForOrderingRelations: true }],
      'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: true }],
      eqeqeq: 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-unneeded-ternary': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: { array: true, object: true },
          AssignmentExpression: { array: true, object: true }
        },
        { enforceForRenamedProperties: false }
      ],
      'prefer-exponentiation-operator': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'rxjs-angular-x/prefer-takeuntil': [
        'error',
        {
          alias: ['takeUntilDestroyed'],
          checkComplete: false,
          checkDestroy: false
        }
      ]
    }
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended]
  },
  {
    // Tailwind correctness wherever classes are written: conflicting or duplicated utilities, and the spike's bans.
    files: ['src/**/*.html', 'src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: tailwindSettings,
    rules: {
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-restricted-classes': ['error', { restrict: restrictedClasses }]
    }
  },
  {
    // Unknown classes (typos, missing tokens, legacy ui-* classes) in migrated templates and the recipes.
    files: [...migratedFiles, 'src/ui/recipes/*.ts', 'src/ui/button/*.ts', 'src/ui/field/*.ts', 'src/ui/icon/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    plugins: { 'better-tailwindcss': betterTailwind },
    settings: tailwindSettings,
    rules: {
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          // Not Tailwind's to know: #909's legacy ui-* classes (tw-lint flags them for their owners) and the
          // CDK's own classes.
          ignore: ['^ui-', '^cdk-']
        }
      ]
    }
  }
);
