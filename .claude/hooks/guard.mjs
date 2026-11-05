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

function checkBash(command, cwd) {
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
