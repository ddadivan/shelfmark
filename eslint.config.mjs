import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import {
  enumAndKeySelectors,
  namedConstantDefinitionFiles,
  namedConstantSelectors,
} from './eslint.named-constants.mjs';
import { testingImportAllowedFiles, testingImportPatterns } from './eslint.contracts-testing.mjs';

// PROJECT.md 5.8: parameterised queries only. Unsafe raw SQL helpers are banned everywhere.
const rawSqlSelectors = ['$queryRawUnsafe', '$executeRawUnsafe'].map((name) => ({
  selector: `Identifier[name='${name}']`,
  message: `${name} is forbidden: use the tagged-template $queryRaw / $executeRaw (parameterised).`,
}));

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  prettier,
  {
    ignores: [
      '**/dist',
      '**/coverage',
      'apps/api/src/generated',
      '**/.nx',
      '**/.angular',
      '**/storybook-static',
      'docs/**',
    ],
  },
  {
    // PROJECT.md 5.0: strict typing, no `any`, no silenced compiler errors.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    // ADR 0024: named constants, no TS enum. Projects that set no-restricted-syntax themselves
    // (eslint.angular.mjs) spread the same selectors.
    files: ['**/*.ts', '**/*.tsx'],
    rules: { 'no-restricted-syntax': ['error', ...namedConstantSelectors, ...rawSqlSelectors] },
  },
  {
    files: namedConstantDefinitionFiles,
    rules: { 'no-restricted-syntax': ['error', ...enumAndKeySelectors, ...rawSqlSelectors] },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: { 'no-restricted-imports': ['error', { patterns: testingImportPatterns }] },
  },
  {
    files: testingImportAllowedFiles,
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            { sourceTag: 'scope:web', onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'] },
            { sourceTag: 'scope:api', onlyDependOnLibsWithTags: ['scope:api', 'scope:shared'] },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:ui', 'type:contracts'] },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:contracts'] },
            { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: ['type:contracts'] },
            { sourceTag: 'type:util', onlyDependOnLibsWithTags: [] },
          ],
        },
      ],
    },
  },
];
