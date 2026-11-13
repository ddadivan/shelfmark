#!/usr/bin/env bash
# Unit tests of one CI entry (the `unit` matrix of the `lint-test-build` check, #349). The affected
# projects with a `test` target are split into groups that run on their own runners side by side,
# so the slowest project no longer sets the length of the whole check:
#
#   api   the API's Vitest suite, one Vitest shard per entry (SHARD / SHARDS, for example 1 and 2).
#         Each shard writes a blob report to .vitest-reports; the `lint-test-build` job merges them
#         and checks the coverage thresholds of apps/api/vitest.config.mts on the whole suite (a
#         single shard covers only part of the code, so its own thresholds are switched off).
#   web   the Angular app.
#   libs  every other project with a `test` target (libs/ui keeps its coverage thresholds).
#
# A group with no affected project does nothing, so `nx affected` decides what runs, as before.
#
# Usage: tools/ci/affected-unit-tests.sh <api|web|libs>
set -euo pipefail

group="${1:?group: api, web or libs}"
affected="$(npx nx show projects --affected --with-target test --json)"
echo "Affected projects with a test target: ${affected}"

# Not `nx affected --projects`: Nx crashes (minimatch makeRe) when a named project is not affected,
# so the affected list is filtered here instead.
projects="$(node -e '
  const [group, list] = [process.argv[1], JSON.parse(process.argv[2])];
  const own = ["api", "web"];
  const picked = group === "libs" ? list.filter((p) => !own.includes(p)) : list.filter((p) => p === group);
  process.stdout.write(picked.join(","));
' "${group}" "${affected}")"

if [ -z "${projects}" ]; then
  echo "::notice::unit ${group}: nothing affected"
  exit 0
fi

if [ "${group}" = "api" ]; then
  shard="${SHARD:?SHARD, for example 1}"
  shards="${SHARDS:?SHARDS, for example 2}"
  npx nx run api:prisma-generate --output-style=static
  # Vitest directly, not through Nx: a cache hit would skip writing the blob report.
  cd apps/api
  npx vitest run --shard="${shard}/${shards}" --reporter=default --reporter=blob \
    --outputFile.blob="../../.vitest-reports/blob-${shard}.json" \
    --coverage.thresholds.lines=0 --coverage.thresholds.branches=0 \
    --coverage.thresholds.functions=0 --coverage.thresholds.statements=0
else
  npx nx run-many -t test -p "${projects}" --output-style=static
fi
