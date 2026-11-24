// Zips the production build of the extension for the Chrome Web Store:
//   npx nx run extension:package   ->   dist/shelfmark-extension-<version>.zip
// Refuses a build whose manifest is not the store one (the development build talks to localhost),
// and a manifest with a `key` (the store assigns the id itself).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const build = resolve(root, 'dist/apps/extension');
const manifestPath = resolve(build, 'manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error('No production build: run `npx nx build extension` first.');
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const hosts = manifest.host_permissions ?? [];
if (hosts.length === 0 || hosts.some((host) => !host.startsWith('https://'))) {
  throw new Error('The manifest is not the store manifest (it has a non-https host permission).');
}
if ('key' in manifest) {
  throw new Error('The store manifest must not contain a `key`.');
}
// The permissions the store review and the privacy texts describe; anything wider needs the author's OK:
// activeTab, contextMenus (right-click save), the optional tabs (All tabs, #569) and the one API host.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (!same(manifest.permissions, ['activeTab', 'contextMenus']) || hosts.length !== 1) {
  throw new Error(
    'The store manifest asks for more than activeTab, contextMenus and the one API host.',
  );
}
if (!same(manifest.optional_permissions ?? [], ['tabs'])) {
  throw new Error('The store manifest may ask only for the optional tabs permission.');
}
// The right-click save worker, which must be in the build.
if (!same(manifest.background, { service_worker: 'background.js', type: 'module' })) {
  throw new Error('The store manifest has an unexpected `background`.');
}
if (!existsSync(resolve(build, 'background.js'))) {
  throw new Error('The build has no background.js: run `npx nx build extension`.');
}
for (const field of [
  'content_scripts',
  'web_accessible_resources',
  'externally_connectable',
  'optional_host_permissions',
]) {
  if (field in manifest) throw new Error(`The store manifest must not contain \`${field}\`.`);
}

const zip = resolve(root, `dist/shelfmark-extension-${manifest.version}.zip`);
rmSync(zip, { force: true });
// `-X` leaves out extra file attributes; `-r` the whole folder, paths relative to the build root;
// dotfiles (`.DS_Store`) are left out at every level. Needs the `zip` command (macOS, Linux).
execFileSync('zip', ['-X', '-r', zip, '.', '-x', '.*', '-x', '*/.*'], {
  cwd: build,
  stdio: 'inherit',
});
console.log(`Packed ${zip}`);
