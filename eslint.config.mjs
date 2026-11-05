import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  prettier,
  {
    ignores: ['**/dist', '**/coverage', '**/.nx', '**/.angular', '**/storybook-static', 'docs/**'],
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
