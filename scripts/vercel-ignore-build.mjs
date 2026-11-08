// Vercel "Ignored Build Step" for shelfmark-app (`ignoreCommand` in vercel.json).
//
// Exit 0 skips the deployment, exit 1 builds it. A preview is skipped only when every file changed
// since the branch's last successful deployment cannot change what Vercel serves (docs, e2e specs,
// unit tests, stories, CI and agent config). A skipped preview takes seconds instead of ~3 minutes in
// the one-at-a-time Hobby build queue. It still counts as a created deployment toward the daily cap
// (ADR 0019). Production always builds, and so does anything the script cannot decide.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Paths that never reach the deployed web bundle or the API function. */
export const NON_DEPLOY_PATHS = [
  /^docs\//,
  /^apps\/web-e2e\//,
  /^\.github\//,
  /^\.claude\//,
  /^tools\/lighthouse\//,
  /\.md$/,
  /\.spec\.ts$/,
  /\.test\.mjs$/,
  /\.stories\.ts$/,
];

/** @param {string} file repo-relative path */
export function isDeployRelevant(file) {
  return !NON_DEPLOY_PATHS.some((pattern) => pattern.test(file));
}

/**
 * @param {{ env: string | undefined, previousSha: string | undefined, changedFiles: (from: string) => string[] | null }} input
 * @returns {{ skip: boolean, reason: string }}
 */
export function decide({ env, previousSha, changedFiles }) {
  if (env === 'production') {
    return { skip: false, reason: 'production always builds' };
  }
  if (!previousSha) {
    return { skip: false, reason: 'no earlier successful deployment of this branch' };
  }
  const files = changedFiles(previousSha);
  if (files === null) {
    return { skip: false, reason: `cannot diff against ${previousSha}` };
  }
  // An empty diff is a manual redeploy of the same commit: build it.
  if (files.length === 0) {
    return { skip: false, reason: 'no changed files (redeploy)' };
  }
  const relevant = files.filter(isDeployRelevant);
  if (relevant.length > 0) {
    return { skip: false, reason: `deployable changes: ${relevant.slice(0, 5).join(', ')}` };
  }
  return { skip: true, reason: `only non-deploy files changed (${files.length})` };
}

/** @param {string} from */
function gitChangedFiles(from) {
  try {
    const out = execFileSync('git', ['diff', '--name-only', from, 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').filter(Boolean);
  } catch {
    // The previous commit is outside Vercel's shallow clone, or was rewritten.
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { skip, reason } = decide({
    env: process.env['VERCEL_ENV'],
    previousSha: process.env['VERCEL_GIT_PREVIOUS_SHA'],
    changedFiles: gitChangedFiles,
  });
  console.log(`${skip ? 'Skipping' : 'Building'}: ${reason}`);
  process.exit(skip ? 0 : 1);
}
