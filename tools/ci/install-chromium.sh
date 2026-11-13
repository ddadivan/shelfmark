#!/usr/bin/env bash
# Installs Playwright's Chromium with its system packages (CI browser jobs). The browser itself is
# cached in ~/.cache/ms-playwright by an `actions/cache` step keyed by the Playwright version (#362);
# on a cache hit `playwright install` skips the download and only the system packages are installed.
#
# The system packages come from the Ubuntu mirrors; when those are down, the runner image already
# has Chromium's libraries, so the browser alone is enough (no screenshot tests depend on system
# fonts).
#
# Usage: tools/ci/install-chromium.sh
set -euo pipefail

timeout 600 npx playwright install --with-deps chromium || {
  echo "::warning::System packages for Chromium failed to install (Ubuntu mirror?); installing the browser only"
  npx playwright install chromium
}
