#!/usr/bin/env bash
# Waits until a job of the same workflow run has uploaded an artifact (#362). The `e2e web` shards
# and `lighthouse` start together with the `web-build` job instead of after it (`needs`), so their
# setup (checkout, npm ci, Chromium) overlaps with the build; this script then waits for the
# `web-e2e-build` artifact. Artifacts can be downloaded as soon as they are uploaded, before the run
# ends.
#
# Writes `found=true` to $GITHUB_OUTPUT when the artifact exists. When the job finished successfully
# without uploading it (it decided nothing needs the bundle), writes `found=false`, so the caller
# builds on its own. Fails when the job failed or was cancelled, or after the timeout.
#
# Usage: tools/ci/wait-for-artifact.sh <artifact> <job name> [timeout seconds, default 900]
# Needs GH_TOKEN (the job's token with `actions: read`), GITHUB_REPOSITORY and GITHUB_RUN_ID.
set -euo pipefail

artifact="${1:?artifact name}"
job="${2:?job name}"
timeout="${3:-900}"
api="repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
output="${GITHUB_OUTPUT:-/dev/stdout}"
deadline=$((SECONDS + timeout))

has_artifact() {
  [ "$(gh api "${api}/artifacts?name=${artifact}" --jq '.total_count')" -gt 0 ]
}

while true; do
  if has_artifact; then
    echo "Artifact ${artifact} is ready after ${SECONDS}s"
    echo "found=true" >>"${output}"
    exit 0
  fi
  # Empty while the job runs; `success`, `failure`, `cancelled` or `skipped` once it is done.
  conclusion="$(gh api "${api}/jobs?filter=latest&per_page=100" \
    --jq ".jobs[] | select(.name == \"${job}\") | .conclusion // \"\"" | head -n 1)"
  case "${conclusion}" in
    '') ;;
    success | skipped)
      # The upload is part of the job, so a successful job without the artifact uploaded nothing.
      if has_artifact; then
        echo "found=true" >>"${output}"
        exit 0
      fi
      echo "::notice::${job} uploaded no ${artifact}; this job builds on its own"
      echo "found=false" >>"${output}"
      exit 0
      ;;
    *)
      echo "::error::${job} ${conclusion}, so there is no ${artifact} to test"
      exit 1
      ;;
  esac
  if [ "${SECONDS}" -ge "${deadline}" ]; then
    echo "::error::No ${artifact} after ${timeout}s"
    exit 1
  fi
  sleep 10
done
