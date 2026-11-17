import { ruleHost, SUGGESTION_KIND } from '@shelfmark/contracts';
import { domainToUnicode } from 'node:url';
import { escapeLike } from '../../common/util/escape-like';
import { AI_RUNNER_LIMIT } from '../models/ai-runner-limit.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { LinkJobExample } from '../models/link-job-example.interface';
import type { SiteExampleTarget } from '../models/site-example-target.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';

/**
 * Earlier choices for the same site as examples for the prompt (AI-2, F1b, ADR 0049): per target,
 * up to `AI_RUNNER_LIMIT.PromptExamplesMax` of the user's other live links with the same
 * `ruleHost`, newest first, that have a folder or tags. What AI applied and the user has not
 * confirmed (open `auto-applied` marks) is left out. Folders appear as keys of the prompt's
 * vocabulary only (a folder outside it is `null`), tags only when they are in the prompt's tag
 * vocabulary (`vocabularyTags`, case-insensitive), so an example never names a tag the prompt does
 * not offer; nothing of another link but its folder key and tag names is read. One query for all
 * targets; every statement filters by `userId`.
 */
export async function loadSiteExamples(
  db: AiDbClient,
  userId: string,
  targets: readonly SiteExampleTarget[],
  folderIdByKey: ReadonlyMap<string, string>,
  vocabularyTags: readonly string[],
): Promise<LinkJobExample[][]> {
  const hosts = targets.map((target) => ruleHost(target.url));
  const distinct = [...new Set(hosts.filter((host): host is string => host !== null))];
  if (distinct.length === 0) return targets.map(() => []);
  const spellings = [...new Set(distinct.flatMap((host) => [host, domainToUnicode(host)]))].filter(
    (name) => name !== '',
  );
  const rows = await db.link.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [{ folderId: { not: null } }, { tags: { some: {} } }],
      AND: [
        {
          OR: spellings.map((name) => ({
            url: { contains: escapeLike(name), mode: 'insensitive' as const },
          })),
        },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: AI_RUNNER_LIMIT.PromptExamplesScanMax * distinct.length,
    select: {
      id: true,
      url: true,
      folderId: true,
      tags: { select: { tag: { select: { name: true } } } },
      suggestions: {
        where: { state: SUGGESTION_ROW_STATE.AutoApplied },
        select: { kind: true, folderId: true, tagName: true },
      },
    },
  });
  const keyById = new Map([...folderIdByKey].map(([key, id]) => [id, key]));
  const offered = new Set(vocabularyTags.map((name) => name.toLowerCase()));
  const byHost = new Map<string, { id: string; example: LinkJobExample }[]>();
  for (const row of rows) {
    const host = ruleHost(row.url);
    if (host === null || !distinct.includes(host)) continue;
    const autoFolder = row.suggestions.some(
      (mark) => mark.kind === SUGGESTION_KIND.Folder && mark.folderId === row.folderId,
    );
    const autoTags = new Set(
      row.suggestions.flatMap((mark) =>
        mark.kind !== SUGGESTION_KIND.Folder && mark.tagName !== null
          ? [mark.tagName.toLowerCase()]
          : [],
      ),
    );
    const folderKey =
      row.folderId === null || autoFolder ? null : (keyById.get(row.folderId) ?? null);
    const tags = row.tags
      .map((entry) => entry.tag.name)
      .filter((name) => offered.has(name.toLowerCase()) && !autoTags.has(name.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'en'));
    if (folderKey === null && tags.length === 0) continue;
    byHost.set(host, [...(byHost.get(host) ?? []), { id: row.id, example: { folderKey, tags } }]);
  }
  return targets.map((target, index) => {
    const host = hosts[index];
    if (host === null || host === undefined) return [];
    return (byHost.get(host) ?? [])
      .filter((entry) => entry.id !== target.linkId)
      .slice(0, AI_RUNNER_LIMIT.PromptExamplesMax)
      .map((entry) => entry.example);
  });
}
