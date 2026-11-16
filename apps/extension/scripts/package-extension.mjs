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
// The permissions the store review and the privacy texts describe; anything wider needs the author's OK.
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['activeTab']) || hosts.length !== 1) {
  throw new Error('The store manifest asks for more than activeTab and the one API host.');
}
for (const field of [
  'background',
  'content_scripts',
  'web_accessible_resources',
  'externally_connectable',
  'optional_permissions',
  'optional_host_permissions',
]) {
  if (field in manifest) throw new Error(`The store manifest must not contain \`${field}\`.`);
}

const zip = resolve(root, `dist/shelfmark-extension-${manifest.version}.zip`);
rmSync(zip, { force: true });
// `-X` leaves out extra file attributes; `-r` the whole folder, paths relative to the build root.
execFileSync('zip', ['-X', '-r', zip, '.', '-x', '.*'], { cwd: build, stdio: 'inherit' });
console.log(`Packed ${zip}`);
