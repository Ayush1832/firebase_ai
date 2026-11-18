import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', 'scripts/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ai/*', 'firebase/ai'],
              message: 'Direct AI logic or getGenerativeModel is restricted to src/ai/ only.',
            },
          ],
        },
      ],
    },
  },
  // src/core must be 100% pure TypeScript: no chrome, no firebase, no react
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core must not import React.' },
            { name: 'react-dom', message: 'src/core must not import react-dom.' },
            { name: 'firebase', message: 'src/core must not import Firebase.' },
            { name: 'firebase/app', message: 'src/core must not import Firebase.' },
            { name: 'firebase/ai', message: 'src/core must not import Firebase AI.' },
          ],
          patterns: [
            { group: ['firebase/*'], message: 'src/core must not import Firebase.' },
            { group: ['**/extension/*'], message: 'src/core must not import extension contexts.' },
          ],
        },
      ],
    },
  },
  // src/ai is allowed to import firebase/ai
  {
    files: ['src/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
