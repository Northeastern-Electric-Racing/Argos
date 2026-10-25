// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const rxjsAngularX = require('eslint-plugin-rxjs-angular-x');

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
  }
);
