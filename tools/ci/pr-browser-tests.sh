#!/usr/bin/env bash
# Browser tests for a pull request into `stage` (CI `e2e` job). Pushes to `stage` and release PRs
# into `main` run the full suites; a PR into `stage` runs only what its diff touches, so the
# required check stays quick. Whatever this skips still runs on the push to `stage` after merge.
#
#   web-e2e: the smoke set, plus
#            - the specs Playwright links to the diff (--only-changed: changed spec files and the
#              specs that import a changed e2e helper),
#            - the specs of each changed feature (apps/web/src/app/features/<name>: specs whose
#              file name contains the feature name, or FEATURE_SPECS below),
#            - SHARED_SPECS when app-wide code changes (core, shell, stores, libs).
#            A change to the Playwright config or the dependencies runs every spec.
#   ui axe:  the Storybook stories of the changed libs/ui components; a change to the shared
#            styles, the Storybook setup or the a11y runner checks every story.
#
# Usage: tools/ci/pr-browser-tests.sh <base-ref>   (for example origin/stage)
set -euo pipefail

base="${1:?base ref, for example origin/stage}"
e2e_dir=apps/web-e2e/src
config=apps/web-e2e/playwright.config.mts
changed="$(git diff --name-only "${base}...HEAD")"
echo "Changed files against ${base}:"
echo "${changed}" | sed 's/^/  /'

has() { echo "${changed}" | grep -Eq "$1"; }

# Key flows that must pass on every PR that touches the web app.
SMOKE_SPECS=(smoke sign-in add-link links-feed)
# App-wide code (core, shell, stores, shared libraries) reaches every page.
SHARED_SPECS=(mobile api-error-toasts)
# Features whose specs do not carry the feature name.
declare -A FEATURE_SPECS=(
  [account-deletion]='delete-account'
  [auth]='sign-in header-account'
  [library]='drag-drop move-link folders'
  [how-it-works]='onboarding'
  [e2e-add-link]='add-link'
  [e2e-csp]='csp'
  [links]='recent'
)

# --- web-e2e -------------------------------------------------------------------------------------
if ! has '^(apps/web|apps/web-e2e|libs)/' && ! has '^(package\.json|package-lock\.json)$'; then
  echo "::notice::web-e2e: nothing in the web app, its e2e or its libraries changed"
elif has "^(${config//./\\.}|package\.json|package-lock\.json)$"; then
  echo "::notice::web-e2e: the Playwright config or the dependencies changed, running every spec"
  npx playwright test -c "${config}"
else
  names=("${SMOKE_SPECS[@]}")
  if has '^(apps/web/src/(app/(core|shell|stores)/|app/app\.|index\.html|styles)|libs/)'; then
    names+=("${SHARED_SPECS[@]}")
  fi
  for feature in $(echo "${changed}" | sed -n 's#^apps/web/src/app/features/\([^/]*\)/.*#\1#p' | sort -u); do
    singular="${feature%s}"
    for spec in "${e2e_dir}"/*"${singular}"*.spec.ts; do
      [ -f "${spec}" ] && names+=("$(basename "${spec}" .spec.ts)")
    done
    # shellcheck disable=SC2206
    [ -n "${FEATURE_SPECS[${feature}]:-}" ] && names+=(${FEATURE_SPECS[${feature}]})
  done
  specs=()
  for name in $(printf '%s\n' "${names[@]}" | sort -u); do
    [ -f "${e2e_dir}/${name}.spec.ts" ] && specs+=("${e2e_dir}/${name}.spec.ts")
  done
  echo "::notice::web-e2e: ${#specs[@]} specs for the changed features, plus specs changed in the diff"
  # Two runs: Playwright intersects file filters with --only-changed, it does not add them up.
  npx playwright test -c "${config}" --only-changed="${base}" --pass-with-no-tests
  npx playwright test -c "${config}" "${specs[@]}"
fi

# --- libs/ui Storybook axe -----------------------------------------------------------------------
if has '^libs/ui/(src/styles|\.storybook|a11y)/' || has '^libs/ui/(project|package)\.json$'; then
  echo "::notice::ui axe: shared styles or the Storybook setup changed, checking every story"
  npx nx run ui:test-storybook --output-style=static
else
  titles=()
  for component in $(echo "${changed}" | sed -n 's#^libs/ui/src/lib/\([^/]*\)/.*#\1#p' | sort -u); do
    for story in libs/ui/src/lib/"${component}"/*.stories.ts; do
      [ -f "${story}" ] || continue
      title="$(sed -n "s/^[[:space:]]*title: '\([^']*\)'.*/\1/p" "${story}" | head -n 1)"
      [ -n "${title}" ] && titles+=("${title}")
    done
  done
  if [ "${#titles[@]}" -eq 0 ]; then
    echo "::notice::ui axe: no libs/ui component story changed"
  else
    # Test titles are `<story title> / <story name> (<theme>)`.
    pattern="$(printf '%s|' "${titles[@]}")"
    echo "::notice::ui axe: checking ${titles[*]}"
    npx nx run ui:test-storybook --output-style=static -- --grep "(^|\\s)(${pattern%|}) / "
  fi
fi
