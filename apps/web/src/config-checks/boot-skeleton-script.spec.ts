import { STORAGE_KEY } from '../app/core/storage/models/storage-key.const';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { EXTENSION_BROWSER_BRAND } from '../app/core/browser-extension/models/extension-browser-brand.const';
import { OTHER_CHROMIUM_BRAND } from '../app/core/browser-extension/models/other-chromium-brand.const';
import { APP_PATH } from '../app/models/app-path.const';
import { readRepoFile } from '../testing/read-repo-file';

// public/boot-skeleton.js runs before the app and cannot import its constants (#490): it repeats
// the ones that decide the extension banner, and both stylesheets repeat the banner's height.
const script = readRepoFile('apps/web/public/boot-skeleton.js');
const BANNER_HEIGHT = 'block-size: rem(64px);';

describe('boot-skeleton.js and the extension banner', () => {
  it('reads the same storage keys as the app (the session hint, the theme, the dismissed banner)', () => {
    for (const key of [
      STORAGE_KEY.SessionHint,
      STORAGE_KEY.Theme,
      STORAGE_KEY.ExtensionBannerDismissed,
      STORAGE_KEY.FeedMemory,
      STORAGE_KEY.LibraryDefaultView,
      STORAGE_KEY.Layout,
      STORAGE_KEY.TidyEntry,
      STORAGE_KEY.FolderShape,
    ]) {
      expect(script).toContain(`'${key}'`);
    }
  });

  it('knows the same browser brands as isExtensionBrowser', () => {
    for (const brand of [
      ...Object.values(EXTENSION_BROWSER_BRAND),
      ...Object.values(OTHER_CHROMIUM_BRAND),
    ]) {
      expect(script, brand).toContain(`'${brand}'`);
    }
  });

  it('holds the place of a banner as tall as the real one', () => {
    expect(readRepoFile('apps/web/src/_boot-skeleton.scss')).toContain(BANNER_HEIGHT);
    expect(
      readRepoFile(
        'apps/web/src/app/features/library/components/extension-banner/extension-banner.component.scss',
      ),
    ).toContain(BANNER_HEIGHT);
  });
});

// The skeleton's main area follows the address (`html[data-boot-page]`): the script picks the
// variant from the path and the markup and stylesheet draw it.
describe('boot-skeleton.js and the page variants', () => {
  const styles = readRepoFile('apps/web/src/_boot-skeleton.scss');
  const markup = readRepoFile('apps/web/src/index.html');
  const PATHS: readonly (readonly [string, string])[] = [
    [`/${APP_PATH.Today}`, 'today'],
    [`/${APP_PATH.Recent}`, 'recent'],
    [`/${APP_PATH.Trash}`, 'trash'],
    [`/${APP_PATH.Reminders}`, 'reminders'],
    [`/${APP_PATH.Revisit}`, 'revisit'],
    [`/${APP_PATH.Tags}`, 'tags'],
    [`/${APP_PATH.Import}`, 'import'],
    [`/${APP_PATH.Ask}`, 'ask'],
    [`/${APP_PATH.Tidy}`, 'tidy'],
    [`/${APP_PATH.Library}`, 'library-tab'],
    [`/${APP_PATH.Settings}`, 'settings'],
    [`/${APP_PATH.Share}`, 'share'],
  ];

  it.each(PATHS)('%s draws the %s page', (path, variant) => {
    expect(script).toContain(path.slice(1));
    expect(script).toContain(`'${variant}'`);
    expect(styles).toContain(`data-boot-page='${variant}'`);
  });

  it('keeps the library blocks for every other address and has the page areas in the markup', () => {
    expect(script).toContain('return null;');
    for (const area of [
      'boot__lib',
      'boot__today',
      'boot__recent',
      'boot__trash',
      'boot__generic',
      'boot__ask',
      'boot__share',
      'boot__rows--list',
      'boot__rows--headlines',
    ]) {
      expect(markup, area).toContain(area);
    }
  });

  it('draws a card as tall as the real one: 4:3 preview, meta, title, source, tags', () => {
    expect(styles).toContain('aspect-ratio: 4 / 3');
    for (const row of ['meta', 'title', 'source', 'tags']) {
      expect(markup).toContain(`boot__card-row--${row}`);
    }
  });
});

// Runs the script against a fake page: the attributes and custom properties it puts on `html`.
interface BootRun {
  readonly attributes: Record<string, string>;
  readonly properties: Record<string, string>;
}

interface BootScenario {
  readonly path: string;
  readonly search?: string;
  readonly storage?: Record<string, string>;
  /** A desktop-wide (80em) window; the default is 1440px. */
  readonly width?: number;
}

function runBootScript(scenario: BootScenario): BootRun {
  const attributes: Record<string, string> = {};
  const properties: Record<string, string> = {};
  const storage = scenario.storage ?? {};
  const width = scenario.width ?? 1440;
  const root = {
    setAttribute: (name: string, value: string): void => {
      attributes[name] = value;
    },
    style: {
      setProperty: (name: string, value: string): void => {
        properties[name] = value;
      },
    },
  };
  const fake = {
    document: { documentElement: root, querySelector: () => null },
    location: { pathname: scenario.path, search: scenario.search ?? '' },
    localStorage: { getItem: (key: string): string | null => storage[key] ?? null },
    matchMedia: (query: string) => ({
      matches:
        query === '(width >= 64em)' ? width >= 1024 : query === '(width >= 80em)' && width >= 1280,
    }),
    navigator: { userAgent: 'Firefox', userAgentData: undefined },
    URLSearchParams,
    setTimeout: () => 0,
  };
  runInNewContext(script, fake);
  return { attributes, properties };
}

const SIGNED_IN = { [STORAGE_KEY.SessionHint]: '1' };

describe('boot-skeleton.js and the share page', () => {
  it('draws the Share Target sheet for a signed-in hint', () => {
    const { attributes } = runBootScript({
      path: '/share',
      search: '?url=https://a.dev',
      storage: SIGNED_IN,
    });
    expect(attributes['data-boot-skeleton']).toBe('');
    expect(attributes['data-boot-page']).toBe('share');
    expect(attributes['data-boot-view']).toBeUndefined();
  });

  it('shows nothing without the hint (a guest is sent to sign-in)', () => {
    expect(runBootScript({ path: '/share' }).attributes['data-boot-skeleton']).toBeUndefined();
  });
});

describe('boot-skeleton.js and the library view', () => {
  const memory = (value: unknown): Record<string, string> => ({
    ...SIGNED_IN,
    [STORAGE_KEY.FeedMemory]: JSON.stringify(value),
  });

  it('is the masonry grid without any memory or Default view', () => {
    const { attributes, properties } = runBootScript({ path: '/links', storage: SIGNED_IN });
    expect(attributes['data-boot-view']).toBe('grid');
    expect(attributes['data-boot-grid']).toBeUndefined();
    expect(properties['--boot-column']).toBeUndefined();
  });

  it.each([
    ['/links', 'all'],
    ['/unsorted', 'unsorted'],
    ['/favorites', 'favorites'],
    ['/folders/f1', 'folder:f1'],
  ])('%s reads the memory of the feed %s', (path, key) => {
    const rows = runBootScript({ path, storage: memory({ [key]: { view: 'list' } }) });
    expect(rows.attributes['data-boot-view']).toBe('list');
    const headlines = runBootScript({ path, storage: memory({ [key]: { view: 'headlines' } }) });
    expect(headlines.attributes['data-boot-view']).toBe('headlines');
    const other = runBootScript({ path, storage: memory({ elsewhere: { view: 'list' } }) });
    expect(other.attributes['data-boot-view']).toBe('grid');
  });

  it('shows cards for both card views and ignores a view it does not know', () => {
    expect(
      runBootScript({ path: '/links', storage: memory({ all: { view: 'cards' } }) }).attributes[
        'data-boot-view'
      ],
    ).toBe('grid');
    expect(
      runBootScript({ path: '/links', storage: memory({ all: { view: 'wall' } }) }).attributes[
        'data-boot-view'
      ],
    ).toBe('grid');
  });

  it('falls back on the cached Default view of the account, the feed memory first', () => {
    const storage = {
      ...memory({ unsorted: { view: 'list' } }),
      [STORAGE_KEY.LibraryDefaultView]: 'headlines',
    };
    expect(runBootScript({ path: '/links', storage }).attributes['data-boot-view']).toBe(
      'headlines',
    );
    expect(runBootScript({ path: '/unsorted', storage }).attributes['data-boot-view']).toBe('list');
  });

  it('survives broken storage', () => {
    const storage = { ...SIGNED_IN, [STORAGE_KEY.FeedMemory]: '{not json' };
    expect(runBootScript({ path: '/links', storage }).attributes['data-boot-view']).toBe('grid');
  });

  it('follows the Grid size of the feed (the column in rem, the step for the visible cards)', () => {
    const { attributes, properties } = runBootScript({
      path: '/links',
      storage: memory({ all: { view: 'masonry', grid: 1 } }),
    });
    expect(attributes['data-boot-grid']).toBe('1');
    expect(properties['--boot-column']).toBe('8.125rem');
    const large = runBootScript({ path: '/links', storage: memory({ all: { grid: 6 } }) });
    expect(large.properties['--boot-column']).toBe('18.75rem');
    const bad = runBootScript({ path: '/links', storage: memory({ all: { grid: 9 } }) });
    expect(bad.attributes['data-boot-grid']).toBeUndefined();
  });

  it('shows a list beside an open preview from 80em', () => {
    const storage = memory({ all: { view: 'masonry' } });
    expect(
      runBootScript({ path: '/links', search: '?preview=l1', storage }).attributes[
        'data-boot-view'
      ],
    ).toBe('list');
    expect(
      runBootScript({ path: '/links', search: '?preview=l1', storage, width: 1100 }).attributes[
        'data-boot-view'
      ],
    ).toBe('grid');
  });

  it('leaves the view to the library only, never to another page', () => {
    expect(
      runBootScript({ path: '/today', storage: SIGNED_IN }).attributes['data-boot-view'],
    ).toBeUndefined();
    expect(
      runBootScript({ path: '/tags', storage: SIGNED_IN }).attributes['data-boot-view'],
    ).toBeUndefined();
  });

  it('copies text size, font and density of the stored layout', () => {
    const { attributes } = runBootScript({
      path: '/links',
      storage: {
        ...SIGNED_IN,
        [STORAGE_KEY.Layout]: JSON.stringify({ textSize: 'l', font: 'system', density: 'compact' }),
      },
    });
    expect(attributes['data-text-size']).toBe('l');
    expect(attributes['data-font']).toBe('system');
    expect(attributes['data-density']).toBe('compact');
    const defaults = runBootScript({
      path: '/links',
      storage: {
        ...SIGNED_IN,
        [STORAGE_KEY.Layout]: JSON.stringify({
          textSize: 'm',
          font: 'onest',
          density: 'comfortable',
        }),
      },
    });
    expect(defaults.attributes['data-card-preview']).toBeUndefined();
    expect(defaults.attributes['data-text-size']).toBeUndefined();
    expect(defaults.attributes['data-density']).toBeUndefined();
  });
});

describe('boot-skeleton.js and the room of late parts', () => {
  it('holds the Tidy button of Unsorted only when it showed last time', () => {
    const held = runBootScript({
      path: '/unsorted',
      storage: { ...SIGNED_IN, [STORAGE_KEY.TidyEntry]: '1' },
    });
    expect(held.attributes['data-boot-tidy']).toBe('');
    for (const storage of [SIGNED_IN, { ...SIGNED_IN, [STORAGE_KEY.TidyEntry]: '0' }]) {
      expect(runBootScript({ path: '/unsorted', storage }).attributes['data-boot-tidy']).toBe(
        undefined,
      );
    }
    expect(
      runBootScript({ path: '/links', storage: { ...SIGNED_IN, [STORAGE_KEY.TidyEntry]: '1' } })
        .attributes['data-boot-tidy'],
    ).toBeUndefined();
  });

  it('marks a folder path and holds the subfolder chips it had last time', () => {
    const storage = {
      ...SIGNED_IN,
      [STORAGE_KEY.FolderShape]: JSON.stringify({ f1: 2, f2: 40, f3: 0, f4: 'x' }),
    };
    const some = runBootScript({ path: '/folders/f1', storage });
    expect(some.attributes['data-boot-folder']).toBe('');
    expect(some.attributes['data-boot-subfolders']).toBe('2');
    expect(runBootScript({ path: '/folders/f2', storage }).attributes['data-boot-subfolders']).toBe(
      '9',
    );
    for (const id of ['f3', 'f4', 'elsewhere']) {
      const run = runBootScript({ path: `/folders/${id}`, storage });
      expect(run.attributes['data-boot-folder']).toBe('');
      expect(run.attributes['data-boot-subfolders']).toBeUndefined();
    }
    expect(runBootScript({ path: '/links', storage }).attributes['data-boot-folder']).toBe(
      undefined,
    );
  });

  it('survives a broken folder shape', () => {
    const run = runBootScript({
      path: '/folders/f1',
      storage: { ...SIGNED_IN, [STORAGE_KEY.FolderShape]: '{not json' },
    });
    expect(run.attributes['data-boot-skeleton']).toBe('');
    expect(run.attributes['data-boot-subfolders']).toBeUndefined();
  });
});

describe('boot-skeleton.js and the card preview setting', () => {
  const layout = (cardPreview: string): Record<string, string> => ({
    ...SIGNED_IN,
    [STORAGE_KEY.Layout]: JSON.stringify({ cardPreview }),
  });

  it('copies a small or off preview and leaves large (the default) out', () => {
    for (const value of ['small', 'off']) {
      const { attributes } = runBootScript({ path: '/links', storage: layout(value) });
      expect(attributes['data-card-preview']).toBe(value);
    }
    for (const value of ['large', 'huge']) {
      const { attributes } = runBootScript({ path: '/links', storage: layout(value) });
      expect(attributes['data-card-preview']).toBeUndefined();
    }
  });
});
