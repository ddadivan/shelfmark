import { AI_LIMIT, ruleHost } from '@shelfmark/contracts';
import type { MockAiLibrary } from './models/mock-ai-library.interface';
import type { MockAiOutcome } from './models/mock-ai-outcome.interface';

const NEW_TAG_MIN = 3;
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'];
/** A site name after the title: " | COS", " - YouTube", " – Site", " — Site". */
const SITE_SUFFIX = /\s+[|\-\u2013\u2014]\s+[^|\-\u2013\u2014]+$/u;

/** The title without its site suffix; `null` when there is none to remove. */
function cleanTitle(title: string): string | null {
  const cleaned = title.replace(SITE_SUFFIX, '').trim();
  return cleaned !== '' && cleaned !== title ? cleaned : null;
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word !== ''),
  );
}

/** The host without `www.`, or `null` for a URL without one. */
const bareHost = ruleHost;

/** Whether every word of `name` is one of `found` (so "cacio e pepe" needs all three). */
function mentioned(name: string, found: ReadonlySet<string>): boolean {
  const parts = [...words(name)];
  return parts.length > 0 && parts.every((part) => found.has(part));
}

/** The folder most links of the same host live in (ties: the folder seen first). */
function folderOfHost(host: string, library: MockAiLibrary): string | null {
  const counts = new Map<string, number>();
  for (const link of library.links) {
    if (link.folderId !== null && bareHost(link.url) === host) {
      counts.set(link.folderId, (counts.get(link.folderId) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  for (const [id, total] of counts) {
    if (best === null || total > (counts.get(best) ?? 0)) {
      best = id;
    }
  }
  return best;
}

/**
 * What the mock model answers for a page, deterministically from the user's own library: existing
 * tags and a folder whose name appears in the title or URL (else the folder most links of the same
 * host are in), at most one new tag (the site's name when it is not a tag yet) and a plain summary.
 * Never anything that is not the user's.
 */
export function mockAiOutcome(url: string, title: string, library: MockAiLibrary): MockAiOutcome {
  const host = bareHost(url);
  const found = words(`${title} ${url}`);
  const video = host !== null && VIDEO_HOSTS.includes(host);
  // A video address also fits the user's "video" tag and "Videos" folder, when they have them.
  const tags = [...library.tags]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .filter((name) => mentioned(name, found) || (video && name.toLowerCase() === 'video'))
    .slice(0, AI_LIMIT.SuggestedTagsMax);
  const sorted = [...library.folders].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const byName =
    sorted.find((folder) => mentioned(folder.name, found)) ??
    (video ? sorted.find((folder) => folder.name.toLowerCase().startsWith('video')) : undefined);
  const site = host?.split('.')[0] ?? '';
  const known = library.tags.some((name) => name.toLowerCase() === site);
  const summary = `${title}. A page from ${host ?? 'the web'}, kept here so you can find it again later.`;
  return {
    folderId: byName?.id ?? (host === null ? null : folderOfHost(host, library)),
    tags,
    newTag: site.length >= NEW_TAG_MIN && !known ? site : null,
    summary: summary.slice(0, AI_LIMIT.SummaryMax),
    title: cleanTitle(title),
  };
}
