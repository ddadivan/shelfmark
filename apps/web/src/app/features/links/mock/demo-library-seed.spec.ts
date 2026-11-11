import { FOLDER_ICON, PIN_KIND } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { buildDemoLibrarySeed, isDemoMockSession } from './demo-library-seed';

const NOW = Date.UTC(2026, 10, 11, 12);

describe('demo library seed', () => {
  afterEach(() => localStorage.clear());

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

  it('pins the Angular folder', () => {
    const { folders, pins } = buildDemoLibrarySeed(NOW);
    const angular = folders.find((folder) => folder.name === 'Angular');
    expect(pins).toEqual([{ kind: PIN_KIND.Folder, id: angular?.id }]);
  });

  it('recognises the demo session only', () => {
    expect(isDemoMockSession()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: false }));
    expect(isDemoMockSession()).toBe(false);
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
    expect(isDemoMockSession()).toBe(true);
  });
});
