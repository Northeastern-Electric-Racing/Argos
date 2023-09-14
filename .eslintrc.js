module.exports = {
  extends: [
   'react-app',
   "react-app/jest"
  ], // Extending the "react-app" configuration

  // Add your custom rules here
  rules: {
    'guard-for-in': 'error',
    'prefer-arrow-callback': 'error',
    'no-unsafe-negation': [
      'error',
      {
        enforceForOrderingRelations: true,
      },
    ],
    'no-unsafe-optional-chaining': [
      'error',
      {
        disallowArithmeticOperators: true,
      },
    ],
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
        VariableDeclarator: {
          array: true,
          object: true,
        },
        AssignmentExpression: {
          array: true,
          object: true,
        },
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    'prefer-exponentiation-operator': 'error',
    'prefer-object-spread': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
  },

  // Ignore patterns for ESLint
  ignorePatterns: [
    '**/.github/**',
    'build',
    'coverage',
    'docs',
    'lambda',
    'node_modules',
    'public',
    'lib',
    'dist',
  ],
};