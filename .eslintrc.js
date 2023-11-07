/* eslint-env node */

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'promise'],
  rules: {
    eqeqeq: ['warn', 'smart'],
    'no-unused-vars': 'off',
    'prefer-const': [
      'warn',
      {
        destructuring: 'all',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // https://typescript-eslint.io/rules/ban-ts-comment
    '@typescript-eslint/ban-ts-comment': [
      1,
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
      },
    ],
    '@typescript-eslint/consistent-type-imports': ['off'],
    'react/prop-types': ['off'],
    'react/no-children-prop': ['off'],
    'react/react-in-jsx-scope': ['off'],
    'react/no-unescaped-entities': ['warn', { forbid: ['>', '}'] }],
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks: '(useRecoilCallback|useRecoilTransaction_UNSTABLE)',
      },
    ],
    'promise/always-return': ['off'],
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:promise/recommended',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
}
