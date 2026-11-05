#!/usr/bin/env node
// PreToolUse guard (PROJECT.md 8.5): blocks secret files, destructive commands
// and commits / pushes to main. Exit code 2 blocks the tool call and shows the
// reason to Claude.
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const ALLOWED_ENV_FILES = new Set(['.env.example']);

function block(reason) {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${reason}\n`);
  process.exit(2);
}

function isSecretEnvName(name) {
  return /^\.env(rc|\..+)?$/.test(name) && !ALLOWED_ENV_FILES.has(name);
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function checkPath(path) {
  if (path && isSecretEnvName(basename(String(path)))) {
    block(
      `access to "${path}" is not allowed. Secrets stay out of Claude's reach; use .env.example for variable names.`,
    );
  }
}

const SECRET_FLAG_RE = /--(show-secrets|decrypt|reveal|show-password|psql)(?![\w-])|decrypt=true/;

const WRAPPERS = new Set(['sudo', 'command', 'env', 'exec', 'nohup', 'time']);
const CLI_NAMES = new Map([
  ['vercel', 'vercel'],
  ['vc', 'vercel'],
  ['neon', 'neon'],
  ['neonctl', 'neon'],
  ['@neondatabase/neonctl', 'neon'],
]);
// Global flags of the two CLIs that take a separate value (so the value is not a subcommand).
const VALUE_FLAGS = new Set([
  '--token',
  '-t',
  '--scope',
  '-S',
  '--team',
  '-T',
  '--cwd',
  '-A',
  '--local-config',
  '--project-id',
  '--api-key',
  '--output',
  '-o',
  '--context-file',
  '--org-id',
  '--config-dir',
]);
// Runner flags that take a separate value.
const RUNNER_VALUE_FLAGS = new Set(['-p', '--package', '--call', '-c', '--cache', '--prefix']);

const NEON_BLOCKED_FIRST = new Set(['connection-string', 'cs', 'init', 'env', 'pull']);
const VERCEL_BLOCKED_FIRST = new Set(['env', 'pull', 'dev', 'api']);

function unquote(token) {
  return token.replace(/^['"]+|['"]+$/g, '');
}

function stripVersion(spec) {
  const at = spec.lastIndexOf('@');
  return at > 0 ? spec.slice(0, at) : spec;
}

function cliName(token) {
  const name = stripVersion(unquote(token));
  return CLI_NAMES.get(name) ?? CLI_NAMES.get(basename(name)) ?? null;
}

// Returns the first package spec after the runner flags, or -1.
function runnerTarget(tokens, from) {
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === '--') continue;
    if (RUNNER_VALUE_FLAGS.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith('-')) continue;
    return i;
  }
  return -1;
}

// Finds a Vercel / Neon CLI call in one simple command, directly or through a runner.
function findCli(tokens) {
  let i = 0;
  while (i < tokens.length && (/^\w+=/.test(tokens[i]) || WRAPPERS.has(tokens[i]))) i++;
  const cmd = tokens[i];
  if (!cmd) return null;

  let target;
  if (cmd === 'npx' || cmd === 'bunx') {
    target = runnerTarget(tokens, i + 1);
  } else if (
    (cmd === 'npm' && (tokens[i + 1] === 'exec' || tokens[i + 1] === 'x')) ||
    ((cmd === 'pnpm' || cmd === 'yarn') && tokens[i + 1] === 'dlx')
  ) {
    target = runnerTarget(tokens, i + 2);
  } else {
    target = i;
  }
  if (target < 0) return null;
  const cli = cliName(tokens[target]);
  return cli ? { cli, args: tokens.slice(target + 1) } : null;
}

function positionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = unquote(args[i]);
    if (VALUE_FLAGS.has(a)) {
      i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    out.push(a);
  }
  return out;
}

function checkSecretCli(command) {
  if (SECRET_FLAG_RE.test(command)) {
    block(
      'flags that print or inject secret values (--show-secrets, --decrypt, --reveal, --show-password, --psql, decrypt=true) are not allowed. Secrets stay in the dashboards; the author handles them.',
    );
  }

  const pieces = command
    .split(/&&|\|\||;|\||\n|\$\(|\(|\)|`|&|["']/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const piece of pieces) {
    const found = findCli(piece.split(/\s+/));
    if (!found) continue;
    const [first, second] = positionals(found.args);
    const why =
      'Vercel and Neon CLI commands that read, write or inject secrets are blocked (PROJECT.md 9.2, ADR 0019). Linking and env vars are done by the author in the dashboard; verify deployments with "gh pr checks".';
    if (found.cli === 'vercel' && VERCEL_BLOCKED_FIRST.has(first)) {
      block(`"vercel ${first}" is not allowed. ${why}`);
    }
    if (found.cli === 'neon') {
      const sub = first === 'project' ? 'projects' : first === 'branch' ? 'branches' : first;
      const blocked =
        NEON_BLOCKED_FIRST.has(sub) ||
        ((sub === 'projects' || sub === 'branches') && second === 'create') ||
        ((sub === 'roles' || sub === 'role') && second !== 'list');
      if (blocked) {
        block(`"neon ${[first, second].filter(Boolean).join(' ')}" is not allowed. ${why}`);
      }
    }
  }
}

function checkBash(command, cwd) {
  checkSecretCli(command);

  // Split into simple commands so "cd x && git commit" is inspected piece by piece.
  const parts = command
    .split(/&&|\|\||;|\||\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // .env files referenced as paths (process.env etc. are fine).
  for (const match of command.matchAll(/(?:^|[\s/'"=:<>(])(\.env[\w.-]*)/g)) {
    if (isSecretEnvName(match[1])) {
      block(`command references "${match[1]}". Do not read or write secret files.`);
    }
  }

  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const cmdIndex = tokens.findIndex((t) => !/^\w+=/.test(t) && t !== 'sudo' && t !== 'command');
    const cmd = tokens[cmdIndex];
    const args = tokens.slice(cmdIndex + 1);

    if (cmd === 'rm') {
      const flags = args.filter((a) => a.startsWith('-')).join(' ');
      const recursive = /(^|\s)-[a-zA-Z]*[rR]|--recursive/.test(flags);
      const force = /(^|\s)-[a-zA-Z]*f|--force/.test(flags);
      if (recursive && force) {
        block(
          '"rm -rf" is not allowed. Use "npx nx reset" for caches or ask the author to delete the files.',
        );
      }
    }

    if (cmd === 'git') {
      const sub = args.find((a) => !a.startsWith('-') && !/^-C$/.test(a));
      const branch = currentBranch(cwd);

      if ((sub === 'commit' || sub === 'push') && args.includes('--no-verify')) {
        block('"--no-verify" skips the secret scan and git hooks.');
      }

      if (sub === 'commit' && branch === 'main') {
        block(
          'committing on main is not allowed. Create a branch: git switch -c <type>/<issue>-<name>.',
        );
      }

      if (sub === 'push') {
        const forced = args.some(
          (a) => a === '--force' || a === '-f' || /^\+/.test(a) || /^-[a-zA-Z]*f/.test(a),
        );
        if (forced) {
          block(
            '"git push --force" is not allowed. Use --force-with-lease on your own feature branch after a rebase.',
          );
        }
        const refs = args.filter((a) => !a.startsWith('-'));
        const targetsMain = refs.some((a) => a === 'main' || /:main$/.test(a) || a === 'HEAD:main');
        const pushesCurrent = refs.length <= 2 && branch === 'main';
        if (targetsMain || pushesCurrent) {
          block('pushing to main is not allowed. Push your branch and open a PR.');
        }
      }
    }

    const prismaArgs =
      cmd === 'prisma'
        ? args
        : ['npx', 'pnpm', 'yarn', 'bunx'].includes(cmd) && args[0] === 'prisma'
          ? args.slice(1)
          : null;
    if (prismaArgs) {
      const sub = prismaArgs
        .filter((a) => !a.startsWith('-'))
        .slice(0, 2)
        .join(' ');
      const destructive =
        sub === 'migrate reset' || (sub === 'db push' && prismaArgs.includes('--force-reset'));
      if (destructive && !/DATABASE_URL=\S*(localhost|127\.0\.0\.1)/.test(part)) {
        block(
          '"prisma migrate reset" is only allowed with an explicit local DATABASE_URL=...@localhost.',
        );
      }
    }
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const { tool_name: tool, tool_input: args = {}, cwd = process.cwd() } = input;

  if (tool === 'Bash') {
    checkBash(String(args.command ?? ''), cwd);
  } else {
    checkPath(args.file_path ?? args.notebook_path);
    checkPath(args.path);
    const globs = [args.glob, tool === 'Glob' ? args.pattern : undefined].filter(
      (g) => typeof g === 'string',
    );
    for (const glob of globs) {
      if (/(^|\/)\.env/.test(glob) && !glob.endsWith('.env.example')) {
        block(`glob "${glob}" targets secret files.`);
      }
    }
  }
  process.exit(0);
});
