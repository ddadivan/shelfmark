import { TestBed } from '@angular/core/testing';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../models/sidebar-collapsed-storage-key.const';
import { SIDEBAR_SECTION } from '../models/sidebar-section.const';
import { SidebarSections } from './sidebar-sections.service';

describe('SidebarSections', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts with every section open', () => {
    const sections = TestBed.inject(SidebarSections);
    expect(Object.values(SIDEBAR_SECTION).map((section) => sections.collapsed(section))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('reads, writes and removes the folded sections of this device', () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify([SIDEBAR_SECTION.Tags]));
    const sections = TestBed.inject(SidebarSections);
    expect(sections.collapsed(SIDEBAR_SECTION.Tags)).toBe(true);
    expect(sections.collapsed(SIDEBAR_SECTION.Pinned)).toBe(false);

    sections.setCollapsed(SIDEBAR_SECTION.Pinned, true);
    expect(sections.collapsed(SIDEBAR_SECTION.Pinned)).toBe(true);
    expect(JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? '[]')).toEqual([
      SIDEBAR_SECTION.Tags,
      SIDEBAR_SECTION.Pinned,
    ]);

    sections.setCollapsed(SIDEBAR_SECTION.Tags, false);
    sections.setCollapsed(SIDEBAR_SECTION.Pinned, false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it('writes nothing when the section is already as asked', () => {
    const sections = TestBed.inject(SidebarSections);
    const write = vi.spyOn(Storage.prototype, 'removeItem');
    sections.setCollapsed(SIDEBAR_SECTION.Folders, false);
    expect(write).not.toHaveBeenCalled();
  });

  it('ignores garbage, unknown sections and blocked storage', () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, '{not json');
    expect(TestBed.inject(SidebarSections).collapsed(SIDEBAR_SECTION.Folders)).toBe(false);
    TestBed.resetTestingModule();
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify(['folders', 'menu', 3]));
    expect(TestBed.inject(SidebarSections).collapsed(SIDEBAR_SECTION.Folders)).toBe(true);
    TestBed.resetTestingModule();
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify({ folders: true }));
    expect(TestBed.inject(SidebarSections).collapsed(SIDEBAR_SECTION.Folders)).toBe(false);
    TestBed.resetTestingModule();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const sections = TestBed.inject(SidebarSections);
    expect(sections.collapsed(SIDEBAR_SECTION.Tags)).toBe(false);
    sections.setCollapsed(SIDEBAR_SECTION.Tags, true);
    expect(sections.collapsed(SIDEBAR_SECTION.Tags)).toBe(true);
  });
});
