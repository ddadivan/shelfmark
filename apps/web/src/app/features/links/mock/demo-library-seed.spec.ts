import { FOLDER_ICON, PIN_KIND } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import { buildDemoLibrarySeed, isDemoMockSession, usesDemoLibrary } from './demo-library-seed';

const NOW = Date.UTC(2026, 10, 11, 12);

describe('demo library seed', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('builds the mockup folders: Work > Angular > Signals, Forms; Courses; Clothes; Recipes', () => {
    const { folders } = buildDemoLibrarySeed(NOW);
    const byName = (name: string) => folders.find((folder) => folder.name === name);
    expect(byName('Work')?.parentId).toBeNull();
    expect(byName('Angular')?.parentId).toBe(byName('Work')?.id);
    expect(byName('Signals')?.parentId).toBe(byName('Angular')?.id);
    expect(byName('Forms')?.parentId).toBe(byName('Angular')?.id);
    expect(byName('Courses')?.parentId).toBe(byName('Work')?.id);
    expect(byName('Clothes')?.parentId).toBeNull();
    expect(byName('Recipes')?.parentId).toBeNull();
    expect(byName('Angular')?.colour).toBe('clay');
    expect(byName('Courses')?.colour).toBe('plum');
    expect(folders.map((folder) => folder.icon)).not.toContain(FOLDER_ICON.Folder);
    expect(new Set(folders.map((folder) => folder.id)).size).toBe(folders.length);
  });

  it('puts every link in an existing folder or Unsorted, with unique ids and spread dates', () => {
    const { folders, links } = buildDemoLibrarySeed(NOW);
    const ids = new Set(folders.map((folder) => folder.id));
    expect(links.every((link) => link.folderId === null || ids.has(link.folderId))).toBe(true);
    expect(links.some((link) => link.folderId === null)).toBe(true);
    expect(new Set(links.map((link) => link.id)).size).toBe(links.length);
    const days = links.map((link) => (NOW - new Date(link.createdAt).getTime()) / 86_400_000);
    expect(Math.min(...days)).toBeLessThan(3);
    expect(Math.max(...days)).toBeGreaterThan(35);
  });

  it('pins the Angular folder, then the Neon link, as in the mockup sidebar', () => {
    const { folders, links, pins } = buildDemoLibrarySeed(NOW);
    const angular = folders.find((folder) => folder.name === 'Angular');
    const neon = links.find((link) => link.title === 'Neon free plan limits');
    expect(pins).toEqual([
      { kind: PIN_KIND.Folder, id: angular?.id },
      { kind: PIN_KIND.Link, id: neon?.id },
    ]);
    expect(neon?.pinned).toBe(true);
  });

  it('pins the Signal Forms video to the top of Angular', () => {
    const { folders, links } = buildDemoLibrarySeed(NOW);
    const angular = folders.find((folder) => folder.name === 'Angular');
    const onTop = links.filter((link) => link.pinnedInFolderAt !== null);
    expect(onTop.map((link) => link.title)).toEqual([
      'Angular 22: everything about Signal Forms in 20 minutes',
    ]);
    expect(onTop[0]?.folderId).toBe(angular?.id);
  });

  it('recognises the demo session only', () => {
    expect(isDemoMockSession()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: false }));
    expect(isDemoMockSession()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
    expect(isDemoMockSession()).toBe(true);
  });

  it('uses the mockup library for the demo, or for any session under the showcase scenario (#326)', () => {
    expect(usesDemoLibrary()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: false }));
    expect(usesDemoLibrary()).toBe(false);
    sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Showcase);
    expect(usesDemoLibrary()).toBe(true);
    localStorage.clear();
    expect(usesDemoLibrary()).toBe(true);
    sessionStorage.setItem(MOCK_LINKS_SCENARIO_KEY, MOCK_LINKS_SCENARIO.Empty);
    expect(usesDemoLibrary()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
    expect(usesDemoLibrary()).toBe(true);
  });
});
