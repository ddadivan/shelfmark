// Installs git hooks for local development only.
// Skipped when there is no .git (e.g. Vercel builds); a worktree has a .git file, so existsSync covers both.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('.git') || process.env['CI'] || process.env['VERCEL']) {
  process.exit(0);
}

try {
  execFileSync('npx', ['--no-install', 'lefthook', 'install'], { stdio: 'inherit' });
} catch {
  console.warn(
    'WARNING: `lefthook install` failed. Git hooks (including the gitleaks secret scan) are NOT active. ' +
      'Fix it by running: npx lefthook install',
  );
}
