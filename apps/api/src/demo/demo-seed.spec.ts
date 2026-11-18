import {
  AI_LIMIT,
  isHttpUrl,
  LINK_KIND,
  LINK_LIMIT,
  normalizeRuleDomain,
  normalizeTagName,
  normalizeUrl,
  REDISCOVER_LIMIT,
  RULE_LIMIT,
  ruleHost,
  TAG_LIMIT,
} from '@shelfmark/contracts';
import { FOLDER_COLOUR, FOLDER_LIMIT } from '@shelfmark/contracts';
import { MOCK_ASK_THEMES } from '../ai/models/mock-ask-themes.const';
import { isStorableUrl } from '../links/dto/is-http-url.decorator';
import { DEMO_SEED } from './demo-seed';

describe('demo seed (seed.json)', () => {
  const folderKeys = DEMO_SEED.folders.map((folder) => folder.key);

  it('has about thirty links, six folders (one nested) and about eight tags', () => {
    expect(DEMO_SEED.links.length).toBeGreaterThanOrEqual(28);
    expect(DEMO_SEED.links.length).toBeLessThanOrEqual(40);
    expect(DEMO_SEED.folders).toHaveLength(6);
    expect(DEMO_SEED.folders.filter((folder) => folder.parent !== null)).toHaveLength(1);
    expect(DEMO_SEED.tags.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_SEED.tags.length).toBeLessThanOrEqual(10);
  });

  it('covers the mockup topics', () => {
    const names = DEMO_SEED.folders.map((folder) => folder.name);
    expect(names).toEqual(
      expect.arrayContaining(['Work', 'Angular', 'Courses', 'Clothes', 'Recipes', 'Videos']),
    );
  });

  it('has valid domain rules on seed folders and tags', () => {
    const tags = new Set(DEMO_SEED.tags.map(normalizeTagName));
    expect(DEMO_SEED.rules.length).toBeLessThanOrEqual(RULE_LIMIT.PerUserMax);
    for (const rule of DEMO_SEED.rules) {
      expect(normalizeRuleDomain(rule.domain)).toBe(rule.domain);
      if (rule.folder !== null) expect(folderKeys).toContain(rule.folder);
      expect(rule.tags.length).toBeLessThanOrEqual(RULE_LIMIT.TagsMax);
      expect(rule.folder !== null || rule.tags.length > 0).toBe(true);
      for (const name of rule.tags) expect(tags.has(normalizeTagName(name))).toBe(true);
    }
  });

  it('gives only known kinds', () => {
    const kinds: readonly string[] = Object.values(LINK_KIND);
    for (const link of DEMO_SEED.links) {
      if (link.kind !== undefined) expect(kinds).toContain(link.kind);
    }
  });

  it('has unique folder keys, parents before children and no missing parent', () => {
    expect(new Set(folderKeys).size).toBe(folderKeys.length);
    DEMO_SEED.folders.forEach((folder, index) => {
      expect(folder.name.length).toBeGreaterThan(0);
      expect(folder.name.length).toBeLessThanOrEqual(FOLDER_LIMIT.NameMax);
      if (folder.parent !== null) {
        expect(folderKeys.slice(0, index)).toContain(folder.parent);
      }
    });
  });

  it('highlights one or two folders, each with a real colour (#440)', () => {
    const highlighted = DEMO_SEED.folders.filter((folder) => folder.highlighted === true);
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
    expect(highlighted.length).toBeLessThanOrEqual(2);
    for (const folder of DEMO_SEED.folders) {
      if (folder.colour !== undefined) {
        expect(Object.values(FOLDER_COLOUR)).toContain(folder.colour);
      }
    }
    for (const folder of highlighted) {
      expect(folder.colour).toBeDefined();
      expect(folder.colour).not.toBe(FOLDER_COLOUR.Graphite);
    }
  });

  it('has valid, unique, storable http(s) URLs and bounded titles and notes', () => {
    const normalized = DEMO_SEED.links.map((link) => normalizeUrl(link.url));
    expect(new Set(normalized).size).toBe(normalized.length);
    for (const link of DEMO_SEED.links) {
      expect(isHttpUrl(link.url)).toBe(true);
      expect(isStorableUrl(link.url)).toBe(true);
      expect(link.title.trim()).not.toBe('');
      expect(link.title.length).toBeLessThanOrEqual(LINK_LIMIT.TitleMax);
      expect(link.note?.length ?? 0).toBeLessThanOrEqual(LINK_LIMIT.NoteMax);
    }
  });

  it('only uses declared folders and tags, with valid tag names', () => {
    const declared = new Set(DEMO_SEED.tags.map((name) => normalizeTagName(name).toLowerCase()));
    expect(declared.size).toBe(DEMO_SEED.tags.length);
    for (const name of DEMO_SEED.tags) {
      expect(name).toBe(normalizeTagName(name));
      expect(name.length).toBeLessThanOrEqual(TAG_LIMIT.NameMax);
    }
    for (const link of DEMO_SEED.links) {
      if (link.folder !== null) expect(folderKeys).toContain(link.folder);
      expect(link.tags.length).toBeLessThanOrEqual(LINK_LIMIT.TagsMax);
      for (const tag of link.tags) expect(declared).toContain(normalizeTagName(tag).toLowerCase());
    }
    // Every folder and tag is used, so nothing in the sandbox is empty by accident.
    const usedFolders = new Set(DEMO_SEED.links.map((link) => link.folder));
    for (const key of folderKeys) expect(usedFolders).toContain(key);
    const usedTags = new Set(
      DEMO_SEED.links.flatMap((link) => link.tags.map((t) => t.toLowerCase())),
    );
    for (const tag of declared) expect(usedTags).toContain(tag);
  });

  it('has sane day offsets and a mix of favorites, opened and never opened links', () => {
    for (const link of DEMO_SEED.links) {
      expect(Number.isInteger(link.createdDaysAgo)).toBe(true);
      expect(link.createdDaysAgo).toBeGreaterThanOrEqual(0);
      if (link.lastOpenedDaysAgo !== null) {
        expect(link.lastOpenedDaysAgo).toBeGreaterThanOrEqual(0);
        // Cannot be opened before it was saved.
        expect(link.lastOpenedDaysAgo).toBeLessThanOrEqual(link.createdDaysAgo);
      }
    }
    expect(DEMO_SEED.links.some((link) => link.isFavorite)).toBe(true);
    expect(DEMO_SEED.links.some((link) => link.lastOpenedDaysAgo === null)).toBe(true);
    expect(DEMO_SEED.links.some((link) => link.lastOpenedDaysAgo !== null)).toBe(true);
    expect(DEMO_SEED.links.some((link) => link.folder === null)).toBe(true);
  });

  it('has AI summaries on most links, each within the stored length (#391)', () => {
    const summarised = DEMO_SEED.links.filter((link) => link.summary !== undefined);
    expect(summarised.length).toBeGreaterThan(DEMO_SEED.links.length / 2);
    for (const link of summarised) {
      expect(link.summary?.trim()).not.toBe('');
      expect(link.summary?.length ?? 0).toBeLessThanOrEqual(AI_LIMIT.SummaryMax);
    }
  });

  it('suggests only on unsorted links, seed folders, a few tags and one new tag overall (#390)', () => {
    const declared = new Set(DEMO_SEED.tags.map((name) => normalizeTagName(name).toLowerCase()));
    const suggesting = DEMO_SEED.links.filter(
      (link) => link.suggestFolder !== undefined || (link.suggestTags?.length ?? 0) > 0,
    );
    expect(suggesting.length).toBeGreaterThanOrEqual(1);
    const newTags: string[] = [];
    for (const link of suggesting) {
      expect(link.folder).toBeNull();
      if (link.suggestFolder !== undefined) expect(folderKeys).toContain(link.suggestFolder);
      const tags = link.suggestTags ?? [];
      const fresh = tags.filter((name) => !declared.has(normalizeTagName(name).toLowerCase()));
      expect(fresh.length).toBeLessThanOrEqual(1);
      expect(tags.length - fresh.length).toBeLessThanOrEqual(AI_LIMIT.SuggestedTagsMax);
      for (const name of tags) {
        expect(name).toBe(normalizeTagName(name));
        expect(name.length).toBeLessThanOrEqual(TAG_LIMIT.NameMax);
        expect(link.tags.map((tag) => tag.toLowerCase())).not.toContain(name.toLowerCase());
      }
      newTags.push(...fresh);
    }
    expect(newTags).toHaveLength(1);
  });

  it('fills Tidy and sets up the rule offer (AI-2)', () => {
    const suggesting = DEMO_SEED.links.filter(
      (link) => link.suggestFolder !== undefined || (link.suggestTags?.length ?? 0) > 0,
    );
    // The design shows "Suggestions for 12 links".
    expect(suggesting.length).toBeGreaterThanOrEqual(12);
    const youtube = DEMO_SEED.links.filter((link) => ruleHost(link.url) === 'youtube.com');
    expect(youtube.filter((link) => link.folder === 'videos')).toHaveLength(2);
    const unsorted = youtube.filter((link) => link.folder === null);
    expect(unsorted.map((link) => link.suggestFolder)).toEqual(['videos']);
    expect(DEMO_SEED.rules.some((rule) => rule.domain === 'youtube.com')).toBe(false);
  });

  it('grounds the canned Ask themes of the mock in seed links (AI-4)', () => {
    const text = (link: (typeof DEMO_SEED.links)[number]): Set<string> =>
      new Set(
        `${link.title} ${link.tags.join(' ')} ${link.summary ?? ''}`
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u),
      );
    for (const theme of MOCK_ASK_THEMES) {
      const matching = DEMO_SEED.links.filter((link) =>
        theme.sourceWords.some((word) => text(link).has(word)),
      );
      expect(matching.length).toBeGreaterThanOrEqual(1);
    }
    const ramen = DEMO_SEED.links.filter((link) => /ramen/i.test(link.title));
    expect(ramen.every((link) => link.folder === 'recipes')).toBe(true);
    expect(ramen.length).toBeGreaterThanOrEqual(3);
    const coats = DEMO_SEED.links.filter((link) => /coat|parka/i.test(link.title));
    expect(coats.every((link) => link.folder === 'clothes')).toBe(true);
    expect(coats).toHaveLength(2);
  });

  it('has enough older, unopened links without a reminder for From your shelf (AI-4)', () => {
    const candidates = DEMO_SEED.links.filter(
      (link) =>
        link.createdDaysAgo >= REDISCOVER_LIMIT.SavedDaysMin &&
        (link.lastOpenedDaysAgo === null ||
          link.lastOpenedDaysAgo >= REDISCOVER_LIMIT.OpenedDaysMin) &&
        (link.remindInHours === undefined || link.remindInHours <= 0),
    );
    expect(candidates.length).toBeGreaterThanOrEqual(REDISCOVER_LIMIT.ItemsMin);
    expect(candidates.length).toBeLessThanOrEqual(REDISCOVER_LIMIT.ItemsMax);
  });
});
