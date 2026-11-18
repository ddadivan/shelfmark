// The required `npm-audit` gate (ADR 0048, #493): fails on a high or critical advisory in a package
// the web app or the API needs at run time. `npm audit --omit=dev` alone still counts build and
// test tooling that a runtime package lists as an optional peer (better-auth lists vitest, which
// brings vite, picomatch and more), and `--omit=optional` would also drop sharp's native binaries.
// So the gate takes `npm audit --omit=dev --json` and leaves out the packages that the lockfile
// marks `dev` or `devOptional` at every place they are installed. The full tree is still audited
// by a non-blocking step of the same job.
// Usage: node tools/ci/audit-runtime.mjs   (in the repository root, after nothing: no install needed)
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);

/** Package name of a lockfile path (`node_modules/a/node_modules/@s/b` is `@s/b`). */
export function packageName(path) {
  const at = path.lastIndexOf('node_modules/');
  return at === -1 ? null : path.slice(at + 'node_modules/'.length);
}

/** True when every installed copy of `name` is dev tooling (`dev` or `devOptional`). */
export function toolingOnly(name, lockPackages) {
  const copies = Object.entries(lockPackages).filter(([path]) => packageName(path) === name);
  return copies.length > 0 && copies.every(([, entry]) => entry.dev || entry.devOptional);
}

/** The blocking advisories of an `npm audit --json` report that reach run-time packages. */
export function runtimeProblems(report, lockPackages) {
  return Object.values(report.vulnerabilities ?? {})
    .filter((vulnerability) => BLOCKING.has(vulnerability.severity))
    .filter((vulnerability) => !toolingOnly(vulnerability.name, lockPackages))
    .map((vulnerability) => `${vulnerability.name} (${vulnerability.severity})`);
}

function audit() {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
  } catch (error) {
    // npm audit exits 1 when it finds anything; the report is still on stdout.
    if (typeof error.stdout === 'string' && error.stdout.trim().startsWith('{'))
      return error.stdout;
    throw error;
  }
}

function main() {
  const report = JSON.parse(audit());
  const lockPackages = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;
  const problems = runtimeProblems(report, lockPackages);
  const skipped = Object.values(report.vulnerabilities ?? {}).filter(
    (vulnerability) =>
      BLOCKING.has(vulnerability.severity) && toolingOnly(vulnerability.name, lockPackages),
  );
  const lines = [
    '## npm audit: run-time dependencies',
    '',
    problems.length === 0
      ? 'No high or critical advisory in a run-time package.'
      : `Blocking: ${problems.join(', ')}.`,
  ];
  if (skipped.length > 0) {
    lines.push(
      '',
      `Left to the full-tree step (dev tooling only): ${skipped.map((v) => v.name).join(', ')}.`,
    );
  }
  const text = `${lines.join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  process.stdout.write(text);
  if (problems.length > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
