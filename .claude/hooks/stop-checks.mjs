#!/usr/bin/env node
// Stop / SubagentStop: run typecheck + tests for projects touched by changed
// files (modified, staged, untracked or deleted) under apps/ and libs/.
// On failure the stop is blocked so Claude keeps working on the fix.
// - Loop-safe: blocks at most once per stop cycle (`stop_hook_active`).
// - Instant when nothing under apps/ or libs/ changed.
// - Read-only agents are skipped on SubagentStop: they share the main checkout
//   and must not be blocked by someone else's uncommitted work.
// - Only uncommitted changes are checked; committed work is covered by CI.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const READ_ONLY_AGENTS = new Set([
  'code-reviewer',
  'security-reviewer',
  'architect',
  'project-manager',
  'Explore',
  'Plan',
]);

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

const input = readInput();
if (input.stop_hook_active === true) process.exit(0);
if (
  input.hook_event_name === 'SubagentStop' &&
  READ_ONLY_AGENTS.has(String(input.agent_type ?? ''))
) {
  process.exit(0);
}

const cwd =
  typeof input.cwd === 'string' && input.cwd
    ? input.cwd
    : (process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

let root = '';
try {
  root = execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  process.exit(0);
}
const nx = resolve(root, 'node_modules', '.bin', 'nx');
if (!existsSync(nx)) process.exit(0);

// NUL-separated porcelain: no C-quoting of special names. For renames/copies
// the entry is followed by the old path, which is skipped.
let files = [];
try {
  const entries = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', 'apps', 'libs'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  ).split('\0');
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    const status = entry.slice(0, 2);
    files.push(entry.slice(3));
    if (status.includes('R') || status.includes('C')) i += 1;
  }
} catch {
  process.exit(0);
}
// `--files` is comma-separated; a name with a comma cannot be passed safely.
files = files.filter((name) => !name.includes(','));
if (files.length === 0) process.exit(0);

try {
  execFileSync(
    nx,
    [
      'affected',
      '-t',
      'typecheck',
      'test',
      `--files=${files.join(',')}`,
      '--output-style=static',
      '--parallel=3',
    ],
    {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 540_000,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  process.exit(0);
} catch (error) {
  // Infrastructure problems are not test failures: let the stop through.
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ENOBUFS' || error?.signal) {
    process.stderr.write(
      `stop-checks: typecheck/test did not finish (${error.code ?? error.signal}); not blocking.\n`,
    );
    process.exit(0);
  }
  const out = `${String(error?.stdout ?? '')}\n${String(error?.stderr ?? '')}`.trim();
  const tail = out.split('\n').slice(-60).join('\n');
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: `Typecheck or tests failed for affected projects (nx affected -t typecheck test on changed files). Fix them before stopping:\n${tail}`,
    }),
  );
  process.exit(0);
}
