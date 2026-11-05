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
// Vercel / Neon credential locations: CLI auth stores and project links.
const CRED_RE = /com\.vercel\.cli|\.config\/neon(ctl)?(\/|$)|(^|[/=<>])\.vercel(\/|$)/;
const SECRET_VAR_RE = /\$\{?\w*(TOKEN|SECRET|DATABASE_URL|PASSWORD)/i;
const SECRET_NAME_RE = /(TOKEN|SECRET|DATABASE_URL|PASSWORD)/i;
// Secret subcommand of the two CLIs inside a script payload (node -e, python -c, ...).
const PAYLOAD_RE =
  /\b(vercel|vc|neonctl|neon)\b\W{1,8}(env|pull|dev|api|connection-string|cs|init)\b|--(show-secrets|decrypt|reveal|show-password|psql)(?![\w-])/;

const WRAPPERS = new Set(['sudo', 'command', 'env', 'exec', 'nohup', 'time', 'nice']);
// Wrapper flags that take a separate value.
const WRAPPER_VALUE_FLAGS = new Map([
  ['env', new Set(['-u', '-C', '-S'])],
  ['sudo', new Set(['-u', '-g', '-h', '-p', '-C', '-U'])],
  ['nice', new Set(['-n'])],
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const INTERPRETERS = new Set([
  'node',
  'nodejs',
  'bun',
  'deno',
  'python',
  'python3',
  'ruby',
  'perl',
]);
const INTERPRETER_FLAGS = new Set(['-e', '--eval', '-p', '--print', '-c']);
const NETWORK_CLIENTS = new Set(['curl', 'wget', 'http', 'xh']);
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
const VERCEL_DEPLOY_FIRST = new Set(['deploy', 'build', 'redeploy']);
const INLINE_ENV_FLAG_RE = /^(-e|-b|--env|--build-env)(=|$)|^-e./;
const MAX_DEPTH = 6;

const WHY_CLI =
  'Vercel and Neon CLI commands that read, write or inject secrets are blocked (PROJECT.md 9.2, ADR 0019). Linking and env vars are done by the author in the dashboard; verify deployments with "gh pr checks".';

function stripVersion(spec) {
  const at = spec.lastIndexOf('@');
  return at > 0 ? spec.slice(0, at) : spec;
}

function cliName(token) {
  const name = stripVersion(token);
  return CLI_NAMES.get(name) ?? CLI_NAMES.get(basename(name)) ?? null;
}

// Shell-like parser. Quoted text is data; command substitutions ($(...), backticks, also inside
// double quotes) are parsed recursively into `out`. Heredoc bodies are data unless the command
// is a shell. Returns the index after the closing ")" of a nested "$(".
function parseShell(src, start, out, nested) {
  let i = start;
  let tokens = [];
  let cur = '';
  let has = false;
  let quoted = false;
  let sqOnly = true;
  let heredocs = [];

  const endToken = () => {
    if (has) tokens.push({ text: cur, quoted, literal: quoted && sqOnly });
    cur = '';
    has = false;
    quoted = false;
    sqOnly = true;
  };
  const endCommand = () => {
    endToken();
    if (tokens.length > 0) out.push(tokens);
    tokens = [];
  };
  const plain = (s) => {
    cur += s;
    has = true;
    sqOnly = false;
  };
  const backtick = () => {
    const close = src.indexOf('`', i + 1);
    const end = close < 0 ? src.length : close;
    parseShell(src.slice(i + 1, end), 0, out, false);
    i = end + 1;
  };

  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      if (src[i + 1] === '\n') {
        i += 2;
        continue;
      }
      plain(src[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (c === "'") {
      const close = src.indexOf("'", i + 1);
      const end = close < 0 ? src.length : close;
      cur += src.slice(i + 1, end);
      has = true;
      quoted = true;
      i = end + 1;
      continue;
    }
    if (c === '"') {
      quoted = true;
      has = true;
      sqOnly = false;
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') {
          cur += src[i + 1] ?? '';
          i += 2;
        } else if (src[i] === '$' && src[i + 1] === '(') {
          i = parseShell(src, i + 2, out, true);
        } else if (src[i] === '`') {
          backtick();
        } else {
          cur += src[i];
          i++;
        }
      }
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      endToken();
      i++;
      continue;
    }
    if (c === '\n') {
      endCommand();
      i++;
      for (const h of heredocs) {
        let body = '';
        while (i < src.length) {
          let nl = src.indexOf('\n', i);
          if (nl < 0) nl = src.length;
          const line = src.slice(i, nl);
          i = Math.min(nl + 1, src.length);
          if (line.trim() === h.delim) break;
          body += `${line}\n`;
        }
        if (h.shell) parseShell(body, 0, out, false);
      }
      heredocs = [];
      continue;
    }
    if (c === ';' || c === '|' || c === '&' || c === '(') {
      endCommand();
      i++;
      continue;
    }
    if (c === ')') {
      endCommand();
      i++;
      if (nested) return i;
      continue;
    }
    if (c === '$' && src[i + 1] === '(') {
      endToken();
      i = parseShell(src, i + 2, out, true);
      continue;
    }
    if (c === '`') {
      endToken();
      backtick();
      continue;
    }
    if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
      let j = i + 2;
      if (src[j] === '-') j++;
      while (src[j] === ' ' || src[j] === '\t') j++;
      const m = /^(['"]?)([\w.-]+)\1/.exec(src.slice(j));
      if (m) {
        const texts = [...tokens.map((t) => t.text)];
        const { index } = skipPrefix(texts);
        const shell = SHELLS.has(basename(texts[index] ?? '')) && !texts.includes('-c');
        heredocs.push({ delim: m[2], shell });
        i = j + m[0].length;
        continue;
      }
    }
    plain(c);
    i++;
  }
  endCommand();
  return i;
}

// Skips env assignments and wrappers (with their flags). `sawEnv` tells whether `env` was consumed.
function skipPrefix(texts) {
  let i = 0;
  let sawEnv = false;
  while (i < texts.length) {
    const t = texts[i];
    if (/^\w+=/.test(t)) {
      i++;
      continue;
    }
    const wrapper = basename(t);
    if (!WRAPPERS.has(wrapper)) break;
    if (wrapper === 'env') sawEnv = true;
    i++;
    const valueFlags = WRAPPER_VALUE_FLAGS.get(wrapper);
    while (i < texts.length && texts[i].startsWith('-') && texts[i] !== '--') {
      i += valueFlags?.has(texts[i]) ? 2 : 1;
    }
  }
  return { index: i, sawEnv };
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

// Finds a Vercel / Neon CLI call in one simple command (texts start at the command word),
// directly or through a runner.
function findCli(texts) {
  const cmd = basename(texts[0] ?? '');
  const next = texts[1];
  let target = 0;
  if (cmd === 'npx' || cmd === 'bunx') {
    target = runnerTarget(texts, 1);
  } else if (
    (cmd === 'npm' && (next === 'exec' || next === 'x')) ||
    (cmd === 'pnpm' && (next === 'exec' || next === 'dlx' || next === 'x')) ||
    (cmd === 'yarn' && (next === 'dlx' || next === 'exec'))
  ) {
    target = runnerTarget(texts, 2);
  } else if ((cmd === 'pnpm' || cmd === 'yarn') && next && cliName(next)) {
    target = 1;
  }
  if (target < 0 || !texts[target]) return null;
  const cli = cliName(texts[target]);
  return cli ? { cli, args: texts.slice(target + 1) } : null;
}

function positionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (VALUE_FLAGS.has(a)) {
      i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    out.push(a);
  }
  return out;
}

function checkTokens(tokens) {
  for (const t of tokens) {
    if (!t.quoted && SECRET_FLAG_RE.test(t.text)) {
      block(
        'flags that print or inject secret values (--show-secrets, --decrypt, --reveal, --show-password, --psql, decrypt=true) are not allowed. Secrets stay in the dashboards; the author handles them.',
      );
    }
    // Quoted prose may mention the paths; a quoted path-like token may not.
    const pathLike = !t.quoted || (/^[~/.$]/.test(t.text) && t.text.includes('/'));
    if (pathLike && CRED_RE.test(t.text)) {
      block(
        `"${t.text}" is a Vercel / Neon credential location (CLI auth store or project link). Do not read or write it; the author handles credentials.`,
      );
    }
  }
}

function checkCli({ cli, args }) {
  if (args.some((a) => SECRET_FLAG_RE.test(a))) {
    block(
      'flags that print or inject secret values (--show-secrets, --decrypt, --reveal, --show-password, --psql, decrypt=true) are not allowed. Secrets stay in the dashboards; the author handles them.',
    );
  }
  const [first, second] = positionals(args);
  if (cli === 'vercel' && VERCEL_BLOCKED_FIRST.has(first)) {
    block(`"vercel ${first}" is not allowed. ${WHY_CLI}`);
  }
  if (
    cli === 'vercel' &&
    args.some((a) => INLINE_ENV_FLAG_RE.test(a)) &&
    (first === undefined || VERCEL_DEPLOY_FIRST.has(first) || first.includes('='))
  ) {
    block(
      '"vercel deploy -e / --env / --build-env" injects secrets inline and is not allowed. Environment variables are set by the author in the dashboard.',
    );
  }
  if (cli === 'neon') {
    const sub = first === 'project' ? 'projects' : first === 'branch' ? 'branches' : first;
    const blocked =
      NEON_BLOCKED_FIRST.has(sub) ||
      ((sub === 'projects' || sub === 'branches') && second === 'create') ||
      ((sub === 'roles' || sub === 'role') && second !== 'list');
    if (blocked) {
      block(`"neon ${[first, second].filter(Boolean).join(' ')}" is not allowed. ${WHY_CLI}`);
    }
  }
}

function analyzeString(src, depth) {
  if (depth > MAX_DEPTH) return;
  const commands = [];
  parseShell(src, 0, commands, false);
  for (const tokens of commands) analyzeCommand(tokens, depth);
}

function analyzePayload(payload, depth) {
  if (PAYLOAD_RE.test(payload) || CRED_RE.test(payload)) {
    block(
      `script payload runs a Vercel / Neon secret command or touches a credential location. ${WHY_CLI}`,
    );
  }
  analyzeString(payload, depth + 1);
}

function analyzeCommand(tokens, depth) {
  checkTokens(tokens);
  const texts = tokens.map((t) => t.text);
  const { index, sawEnv } = skipPrefix(texts);

  if (index >= texts.length) {
    if (sawEnv) {
      block('a bare "env" dumps every environment variable, including secrets.');
    }
    return;
  }

  const cmd = basename(texts[index]);
  const rest = tokens.slice(index + 1);

  if (cmd === 'printenv') {
    const names = rest.filter((t) => !t.text.startsWith('-'));
    if (names.length === 0 || names.some((t) => SECRET_NAME_RE.test(t.text))) {
      block('"printenv" without a harmless variable name dumps secrets from the environment.');
    }
  }

  if (cmd === 'echo' || cmd === 'printf') {
    if (rest.some((t) => !t.literal && SECRET_VAR_RE.test(t.text))) {
      block(
        'printing a variable that holds a token, secret, password or database URL is not allowed.',
      );
    }
  }

  if (NETWORK_CLIENTS.has(cmd) && rest.some((t) => /decrypt=true/.test(t.text))) {
    block('"decrypt=true" requests secret values and is not allowed.');
  }

  if (SHELLS.has(cmd)) {
    const flag = rest.findIndex((t) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(t.text));
    if (flag >= 0 && rest[flag + 1]) analyzeString(rest[flag + 1].text, depth + 1);
  } else if (cmd === 'eval') {
    analyzeString(rest.map((t) => t.text).join(' '), depth + 1);
  } else if (INTERPRETERS.has(cmd)) {
    for (let i = 0; i < rest.length; i++) {
      const text = rest[i].text;
      if (INTERPRETER_FLAGS.has(text) && rest[i + 1]) {
        analyzePayload(rest[i + 1].text, depth);
      } else if (text.startsWith('--eval=') || text.startsWith('--print=')) {
        analyzePayload(text.slice(text.indexOf('=') + 1), depth);
      }
    }
  }

  const found = findCli(texts.slice(index));
  if (found) checkCli(found);
}

function checkSecretCli(command) {
  analyzeString(command, 0);
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
