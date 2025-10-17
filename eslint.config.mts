import { FlatCompat } from '@eslint/eslintrc';
import pluginReact from 'eslint-plugin-react';
import pluginTypeScript from '@typescript-eslint/eslint-plugin';
import parserTypeScript from '@typescript-eslint/parser';

const compat = new FlatCompat();

export default [
  // Règles de base et environnement
  ...compat.extends('eslint:recommended'),
  ...compat.extends('plugin:react/recommended'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('plugin:prettier/recommended'), // Ajoute Prettier

  {
    plugins: {
      react: pluginReact,
      '@typescript-eslint': pluginTypeScript,
    },
    languageOptions: {
      parser: parserTypeScript,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Exemple de personnalisation : adapte ici à ta convenance
      'react/react-in-jsx-scope': 'off', // Next.js/React 17+
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
        },
      ],
    },
  },
];
