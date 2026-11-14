const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * Orders two SemVer strings: negative when `a` is older, 0 when equal, positive when newer. A
 * pre-release (`2.1.0-dev`) comes before its release; an unreadable version counts as the oldest.
 */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a);
  const pb = SEMVER.exec(b);
  if (!pa || !pb) {
    return (pa ? 1 : 0) - (pb ? 1 : 0);
  }
  for (const index of [1, 2, 3]) {
    const diff = Number(pa[index]) - Number(pb[index]);
    if (diff !== 0) {
      return diff;
    }
  }
  const [preA, preB] = [pa[4], pb[4]];
  if (preA === preB) {
    return 0;
  }
  if (preA === undefined) {
    return 1;
  }
  if (preB === undefined) {
    return -1;
  }
  return preA < preB ? -1 : 1;
}
