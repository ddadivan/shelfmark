import playwright from 'eslint-plugin-playwright';
import { enumSelectors } from '../../eslint.named-constants.mjs';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    // e2e asserts the rendered DOM as a black box and must not import app code (ADR 0024).
    rules: { 'no-restricted-syntax': ['error', ...enumSelectors] },
  },
];
