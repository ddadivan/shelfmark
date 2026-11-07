// Runs the isolated Lighthouse CI install (tools/lighthouse, ADR 0028).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const bin = 'tools/lighthouse/node_modules/.bin/lhci';
if (!existsSync(bin)) {
  console.error(
    'Lighthouse CI is not installed. Run: npm ci --ignore-scripts --prefix tools/lighthouse',
  );
  process.exit(1);
}
const result = spawnSync(bin, ['autorun', '--config=apps/web-e2e/lighthouserc.cjs'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
