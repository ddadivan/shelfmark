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

/** The static policy for files documented in docs/SETUP.md 5.6. */
export function readCspFromSetupDoc(): string {
  return readSetupCodeSpan(/Static CSP \(files[^)]*\): `([^`]+)`/, 'static CSP');
}

/** The document policy template (`{nonce}` placeholder) documented in docs/SETUP.md 5.6. */
export function readCspTemplateFromSetupDoc(): string {
  return readSetupCodeSpan(/Document CSP template \([^)]*\): `([^`]+)`/, 'document CSP template');
}

/** The `matcher` array literal of the root `middleware.ts`, read as text (Vercel reads it so too). */
export function readMiddlewareMatcher(): string[] {
  const source = readFileSync(join(workspaceRoot, 'middleware.ts'), 'utf8');
  const block = /matcher:\s*\[([\s\S]*?)\n?\s*\]\s*,?\s*\};/.exec(source)?.[1];
  if (!block) {
    throw new Error('middleware.ts has no literal matcher array');
  }
  // The array holds single-quoted string literals without quotes inside.
  return Array.from(block.matchAll(/'([^']*)'/g), (m) => m[1] ?? '');
}

function readSetupCodeSpan(pattern: RegExp, name: string): string {
  const doc = readFileSync(join(workspaceRoot, 'docs/SETUP.md'), 'utf8');
  const match = pattern.exec(doc);
  if (!match?.[1]) {
    throw new Error(`docs/SETUP.md 5.6 has no ${name} code span`);
  }
  return match[1];
}

// Mirrors Vercel's path-to-regexp for the simple patterns used in vercel.json:
// literal segments, regex groups (lookaheads included) and a trailing `:name*`.
export function sourceToRegExp(source: string): RegExp {
  const pattern = source.replace(/\/:\w+\*/g, '(?:/.*)?');
  return new RegExp(`^${pattern}$`);
}

function isCsp(key: string): boolean {
  return key.toLowerCase() === 'content-security-policy';
}
