import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VercelConfig } from './models/vercel-config.interface';
import type { VercelHeaderRule } from './models/vercel-header-rule.interface';

const CSP_HEADER = 'content-security-policy';

// libs/web/csp/src/testing -> the workspace root (Vitest runs this file unbundled).
const workspaceRoot = join(import.meta.dirname, '..', '..', '..', '..', '..');

/** Reads a repo file (relative to the workspace root) as text. */
function readRepoFile(path: string): string {
  return readFileSync(join(workspaceRoot, path), 'utf8');
}

export function readVercelConfig(): VercelConfig {
  // The file is repo-owned and read-only here; the shape is asserted by the tests themselves.
  return JSON.parse(readRepoFile('vercel.json')) as VercelConfig;
}

export function headerRulesWithCsp(config: VercelConfig): VercelHeaderRule[] {
  return config.headers.filter((rule) => hasHeader(rule, CSP_HEADER));
}

/** Whether a header rule sets the header `name` (case-insensitive, as HTTP header names are). */
export function hasHeader(rule: VercelHeaderRule, name: string, value?: string): boolean {
  return rule.headers.some(
    (header) =>
      header.key.toLowerCase() === name.toLowerCase() &&
      (value === undefined || header.value === value),
  );
}

export function readCsp(config: VercelConfig): string {
  const value = headerRulesWithCsp(config)
    .flatMap((rule) => rule.headers)
    .find((header) => header.key.toLowerCase() === CSP_HEADER)?.value;
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
  const source = readRepoFile('middleware.ts');
  const block = /matcher:\s*\[([\s\S]*?)\n?\s*\]\s*,?\s*\};/.exec(source)?.[1];
  if (!block) {
    throw new Error('middleware.ts has no literal matcher array');
  }
  // The array holds single-quoted string literals without quotes inside.
  return Array.from(block.matchAll(/'([^']*)'/g), (m) => m[1] ?? '');
}

function readSetupCodeSpan(pattern: RegExp, name: string): string {
  const doc = readRepoFile('docs/SETUP.md');
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
