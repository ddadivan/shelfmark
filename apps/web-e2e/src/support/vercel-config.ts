import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import type { VercelConfig } from '../models/vercel-config.interface';
import type { VercelHeaderRule } from '../models/vercel-header-rule.interface';

export function readVercelConfig(): VercelConfig {
  // The file is repo-owned and read-only here; the shape is asserted by the tests themselves.
  return JSON.parse(readFileSync(join(workspaceRoot, 'vercel.json'), 'utf8')) as VercelConfig;
}

export function headerRulesWithCsp(config: VercelConfig): VercelHeaderRule[] {
  return config.headers.filter((rule) => rule.headers.some((h) => isCsp(h.key)));
}

export function readCsp(config: VercelConfig): string {
  const value = headerRulesWithCsp(config)
    .flatMap((rule) => rule.headers)
    .find((h) => isCsp(h.key))?.value;
  if (!value) {
    throw new Error('vercel.json has no Content-Security-Policy header');
  }
  return value;
}

export function readCspFromSetupDoc(): string {
  const doc = readFileSync(join(workspaceRoot, 'docs/SETUP.md'), 'utf8');
  const match = /CSP: `([^`]+)`/.exec(doc);
  if (!match?.[1]) {
    throw new Error('docs/SETUP.md 5.6 has no CSP code span');
  }
  return match[1];
}

// Mirrors Vercel's path-to-regexp for the simple patterns used in vercel.json:
// literal segments, regex groups and a trailing `:name*`.
export function sourceToRegExp(source: string): RegExp {
  const pattern = source.replace(/\/:\w+\*/g, '(?:/.*)?');
  return new RegExp(`^${pattern}$`);
}

function isCsp(key: string): boolean {
  return key.toLowerCase() === 'content-security-policy';
}
