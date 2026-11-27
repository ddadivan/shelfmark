import { AI_LIMIT, isStorableUrl, LINK_LIMIT } from '@shelfmark/contracts';

/** The link fields a create or an update may carry; every one is optional here. */
interface LinkFields {
  readonly url?: string;
  readonly title?: string;
  readonly note?: string | null;
  readonly tags?: readonly string[];
  readonly summary?: string | null;
}

/**
 * What the API's validation (`CreateLinkDto`, `UpdateLinkDto`) would reject in these fields:
 * a URL that is not http(s) or is too long, an empty or too long title, a too long note or summary, too many
 * tags. Empty list: valid.
 */
export function linkFieldsProblems(fields: LinkFields): string[] {
  const problems: string[] = [];
  if (fields.url !== undefined) {
    const url = fields.url.trim();
    if (!isStorableUrl(url)) {
      problems.push(
        `url must be an http(s) URL without credentials, at most ${LINK_LIMIT.UrlMax} characters`,
      );
    }
  }
  if (fields.title !== undefined) {
    const length = fields.title.trim().length;
    if (length < 1 || length > LINK_LIMIT.TitleMax) {
      problems.push(`title must be 1 to ${LINK_LIMIT.TitleMax} characters`);
    }
  }
  if (typeof fields.note === 'string' && fields.note.length > LINK_LIMIT.NoteMax) {
    problems.push(`note must be at most ${LINK_LIMIT.NoteMax} characters`);
  }
  if (typeof fields.summary === 'string' && fields.summary.trim().length > AI_LIMIT.SummaryMax) {
    problems.push(`summary must be at most ${AI_LIMIT.SummaryMax} characters`);
  }
  if (fields.tags !== undefined && fields.tags.length > LINK_LIMIT.TagsMax) {
    problems.push(`tags must hold at most ${LINK_LIMIT.TagsMax} tags`);
  }
  return problems;
}
