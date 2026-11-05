#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): format and lint-fix the edited file.
// Never blocks: formatting problems are fixed silently, remaining lint errors
// are reported back to Claude as context so it can fix them.
// The repo root is the git top level of the edited file (works in worktrees and
// when the session's cwd is a subdirectory). A worktree without its own
// node_modules is skipped silently.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

const PRETTIER_EXT = new Set([
  '.ts',
  '.mjs',
  '.js',
  '.json',
  '.html',
  '.scss',
  '.css',
  '.md',
  '.yml',
  '.yaml',
]);
const ESLINT_EXT = new Set(['.ts', '.mjs', '.js', '.html']);
const SKIP_DIRS = /(^|\/)(node_modules|dist|coverage|\.nx|\.angular|storybook-static)\//;

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function gitRoot(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const input = readInput();
const base =
  typeof input.cwd === 'string' && input.cwd
    ? input.cwd
    : (process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const rawPath = input?.tool_input?.file_path ?? input?.tool_response?.filePath;
if (typeof rawPath !== 'string' || rawPath === '') process.exit(0);

const file = isAbsolute(rawPath) ? rawPath : resolve(base, rawPath);
if (!existsSync(file)) process.exit(0);
const root = gitRoot(dirname(file));
if (root === '') process.exit(0);

const rel = relative(root, file);
const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
if (outside || SKIP_DIRS.test(rel)) process.exit(0);

const ext = extname(file);
const bin = (name) => resolve(root, 'node_modules', '.bin', name);
const target = `.${sep}${rel}`; // never parsed as a flag

if (PRETTIER_EXT.has(ext) && existsSync(bin('prettier'))) {
  try {
    execFileSync(bin('prettier'), ['--write', '--log-level', 'warn', '--ignore-unknown', target], {
      cwd: root,
      stdio: 'pipe',
      timeout: 30_000,
    });
  } catch {
    // Unparseable file or timeout: leave it, the compiler/linter will report it.
  }
}

if (ESLINT_EXT.has(ext) && existsSync(bin('eslint'))) {
  try {
    execFileSync(bin('eslint'), ['--fix', '--no-warn-ignored', target], {
      cwd: root,
      stdio: 'pipe',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const out = String(error?.stdout ?? '').trim();
    if (out) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `ESLint errors remain in ${rel} after --fix:\n${out.slice(0, 4000)}`,
          },
        }),
      );
    }
  }
}
process.exit(0);
