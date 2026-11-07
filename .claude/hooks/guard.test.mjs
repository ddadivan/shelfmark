import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const guard = join(here, 'guard.mjs');

// The guard reads the current branch of the cwd it is given. Never use the real
// checkout as cwd: CI on a push to main runs on branch main, so every "allowed"
// commit case would be blocked there. Use throwaway repos with a known branch.
const tempRepos = [];

function tempRepo(branch) {
  const dir = mkdtempSync(join(tmpdir(), 'guard-test-'));
  tempRepos.push(dir);
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q', '-b', branch);
  git(
    '-c',
    'user.name=guard-test',
    '-c',
    'user.email=guard-test@example.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-q',
    '--allow-empty',
    '-m',
    'init',
  );
  return dir;
}

const featureRepo = tempRepo('feat/test');
const mainRepo = tempRepo('main');

after(() => {
  for (const dir of tempRepos) rmSync(dir, { recursive: true, force: true });
});

function run(toolInput, tool = 'Bash', cwd = featureRepo) {
  return spawnSync('node', [guard], {
    input: JSON.stringify({ tool_name: tool, tool_input: toolInput, cwd }),
    encoding: 'utf8',
  });
}

function bash(command) {
  return run({ command });
}

const blocked = [
  // Vercel CLI, direct and aliased
  'vercel env ls',
  'vercel env pull .vercel/x',
  'vercel env add FOO production',
  'vercel env rm FOO',
  'vc env ls',
  'vercel pull',
  'vercel pull --yes',
  'vercel dev',
  'vercel api /v9/projects',
  'vercel --token abc env ls',
  'vercel -t abc pull',
  'FOO=1 vercel env ls',
  'sudo vercel env ls',
  // runners
  'npx vercel env ls',
  'npx -y vercel env pull',
  'npx --yes vercel@latest env ls',
  'npx vercel@39.1.0 pull',
  'npx -p vercel vercel env ls',
  'npm exec vercel env ls',
  'npm exec -- vercel@latest pull',
  'npm x vercel dev',
  'pnpm dlx vercel env ls',
  'yarn dlx vercel@latest pull',
  'bunx vercel env ls',
  'bunx vercel@latest api /v2/user',
  // compound commands and subshells
  'cd apps/api && vercel env ls',
  'echo hi; npx vercel pull',
  'true || vercel dev',
  'echo hi | vercel env ls',
  'echo $(vercel env pull)',
  'bash -c "vercel env ls"',
  // Neon CLI
  'neonctl connection-string',
  'neonctl cs',
  'neon connection-string --project-id x',
  'neon cs',
  'neonctl --project-id abc cs',
  'neonctl projects create --name x',
  'neonctl project create',
  'neonctl branches create --name x',
  'neon branch create',
  'neonctl roles reset-password',
  'neonctl roles create --name x',
  'neonctl roles delete x',
  'neonctl init',
  'neon env',
  'neon pull',
  'npx neonctl connection-string',
  'npx neonctl@latest cs',
  'npx -y neon init',
  'npx @neondatabase/neonctl cs',
  'pnpm dlx neonctl roles create',
  'bunx neonctl@2 branches create',
  'npm exec neon pull',
  // secret flags in any command
  'neonctl branches list --show-secrets',
  'something --decrypt',
  'tool --reveal',
  'tool --show-password',
  'neonctl cs --psql',
  'curl "https://api.example.test/env?decrypt=true"',
  // shells, eval and script payloads are analysed as commands
  'bash -c "vercel env pull"',
  "sh -c 'npx vercel pull'",
  'zsh -lc "vercel env ls"',
  'eval "vercel env ls"',
  'echo "$(vercel env ls)"',
  'echo `vercel env ls`',
  `node -e "require('child_process').execSync('vercel env ls')"`,
  // wrapper flags, other runners
  'env -i vercel env ls',
  'env -u FOO vercel env ls',
  'npx -y vercel@latest pull',
  'pnpm exec vercel env ls',
  'pnpm vercel env ls',
  'yarn vercel pull',
  'yarn dlx neonctl cs',
  // credential files and env dumps
  'cat ~/Library/Application\\ Support/com.vercel.cli/auth.json',
  'cat "~/Library/Application Support/com.vercel.cli/auth.json"',
  'cat ~/.local/share/com.vercel.cli/auth.json',
  'cat ~/.config/neonctl/credentials.json',
  'cat .vercel/project.json',
  'printenv',
  'env',
  'env | grep TOKEN',
  'printenv VERCEL_TOKEN',
  'echo $VERCEL_TOKEN',
  'echo "$DATABASE_URL"',
  'printf %s ${GITHUB_TOKEN}',
  // inline secrets on deploy
  'vercel deploy -e KEY=val',
  'vercel deploy --build-env KEY=val',
  'vercel deploy --env=KEY=val',
];

const allowed = [
  'vercel ls',
  'vercel inspect https://shelfmark-app.vercel.app',
  'vercel --version',
  'vc ls',
  'npx vercel ls',
  'gh pr checks 3',
  'gh pr view 3',
  'npx nx build api',
  'npx nx run-many -t lint typecheck test build',
  'npm exec nx build api',
  'node --test .claude/hooks/',
  'neon branches list',
  'neonctl branches list',
  'neonctl projects list',
  'neonctl roles list',
  'neon --version',
  'npx neonctl branches list',
  'echo environment',
  'ls api',
  'git commit -m "docs: vercel env notes"',
  'gh pr create --body "never run vercel env pull; avoid --decrypt"',
  'gh issue comment 3 --body "neon connection-string is blocked"',
  'gh pr create --body "decrypt, reveal and psql are blocked; see ~/.config/neonctl and .vercel/"',
  [
    `git commit -m "$(cat <<'EOF'`,
    "fix: don't run vercel env pull",
    '',
    'Refs #3',
    'EOF',
    ')"',
  ].join('\n'),
  'echo "printenv"',
  'echo $HOME',
  'printenv HOME',
  'env NODE_ENV=test npx nx test api',
  'FOO=1 env -i npx nx test api',
  'bash -c "npx nx test api"',
  'vercel deploy --prod',
  'echo "$VERCEL_ENV"',
  `echo '$VERCEL_TOKEN'`,
];

for (const command of blocked) {
  test(`blocks: ${command}`, () => {
    const result = bash(command);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Blocked by \.claude\/hooks\/guard\.mjs/);
  });
}

for (const command of allowed) {
  test(`allows: ${command}`, () => {
    const result = bash(command);
    assert.equal(result.status, 0, result.stderr);
  });
}

test('blocks a commit on main, allows other git commands there', () => {
  const commit = run({ command: 'git commit -m x' }, 'Bash', mainRepo);
  assert.equal(commit.status, 2, commit.stderr);
  assert.match(commit.stderr, /committing on main is not allowed/);
  const status = run({ command: 'git status' }, 'Bash', mainRepo);
  assert.equal(status.status, 0, status.stderr);
});

test('blocks a push from a main checkout', () => {
  const result = run({ command: 'git push' }, 'Bash', mainRepo);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /pushing to main is not allowed/);
});

test('allows a commit and push on a feature branch', () => {
  const commit = run({ command: 'git commit -m x' });
  assert.equal(commit.status, 0, commit.stderr);
  const push = run({ command: 'git push -u origin feat/test' });
  assert.equal(push.status, 0, push.stderr);
});

test('blocks --no-verify', () => {
  const result = bash('git commit --no-verify -m x');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--no-verify/);
});

test('blocks force push', () => {
  assert.equal(bash('git push --force origin feat/x').status, 2);
});

test('blocks rm -rf', () => {
  assert.equal(bash('rm -rf dist').status, 2);
});

test('blocks reading env files, allows .env.example', () => {
  assert.equal(run({ file_path: '/repo/.env.local' }, 'Read').status, 2);
  assert.equal(bash('cat .env.production').status, 2);
  assert.equal(run({ file_path: '/repo/.env.example' }, 'Read').status, 0);
});
