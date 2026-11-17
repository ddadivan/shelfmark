#!/usr/bin/env node
// A PR into `main` must raise the root package.json version (#424, PROJECT.md 9.3): the release
// PR `stage → main` bumps the minor (2.1.0), a hotfix into `main` the patch (2.0.6). The new
// version is plain SemVer: the `-dev` suffix `stage` carries must go in the release PR.
//
// Usage (CI, pull_request into main): node tools/ci/check-version-bump.mjs origin/main
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/** `{ major, minor, patch, pre }` of a SemVer string, or null. */
export function parseVersion(text) {
  const match = SEMVER.exec(String(text ?? '').trim());
  if (!match) return null;
  return { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4] ?? null };
}

/** Negative when a < b, 0 when equal, positive when a > b (a pre-release sorts before its release). */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Not a SemVer version: ${pa ? b : a}`);
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key];
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

/** Problems with `head` as the next version after `base`; empty when the bump is fine. */
export function versionBumpProblems(base, head) {
  const parsed = parseVersion(head);
  if (!parsed) return [`package.json version "${head}" is not SemVer (x.y.z).`];
  if (parsed.pre !== null) {
    return [
      `package.json version "${head}" has a pre-release suffix; a PR into main sets the release number (x.y.z).`,
    ];
  }
  // A main that never had a real version (0.0.0 before #424) or an unreadable one: any release goes.
  if (!parseVersion(base)) return [];
  if (compareVersions(head, base) <= 0) {
    return [
      `package.json version "${head}" must be greater than main's "${base}" (release: minor, hotfix: patch).`,
    ];
  }
  return [];
}

function versionOf(json) {
  const parsed = JSON.parse(json);
  return typeof parsed?.version === 'string' ? parsed.version : '';
}

function main() {
  const baseRef = process.argv[2] ?? 'origin/main';
  const base = versionOf(
    execFileSync('git', ['show', `${baseRef}:package.json`], { encoding: 'utf8' }),
  );
  const head = versionOf(readFileSync('package.json', 'utf8'));
  const problems = versionBumpProblems(base, head);
  for (const problem of problems) console.error(`::error::${problem}`);
  if (problems.length > 0) process.exit(1);
  console.log(`Version bump OK: ${base || '(none)'} → ${head}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
