import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { FOLDER_EMOJI_CATALOG } from '../models/folder-emoji-catalog.const';
import { loadFolderEmojiNames } from './folder-emoji-names.loader';

describe('folder emoji names', () => {
  it.each(Object.values(APP_LANG))('names every catalogue emoji in %s', async (lang) => {
    const names = await loadFolderEmojiNames(lang);
    const all = Object.values(FOLDER_EMOJI_CATALOG).flat();
    expect(Object.keys(names)).toEqual(all);
    expect(all.filter((emoji) => !names[emoji]?.[0])).toEqual([]);
  });

  it('falls back to English for a language the app does not have', async () => {
    expect((await loadFolderEmojiNames('xx'))['🍕'][0]).toBe('pizza');
  });

  it('keeps the generated files in sync (scripts/build-folder-emoji.mjs --check)', () => {
    expect(() =>
      execFileSync('node', [join(process.cwd(), 'scripts/build-folder-emoji.mjs'), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
