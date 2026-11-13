import { isHttpUrl, LINK_LIMIT } from '@shelfmark/contracts';

/** The link fields a create or an update may carry; every one is optional here. */
interface LinkFields {
  readonly url?: string;
  readonly title?: string;
  readonly note?: string | null;
  readonly tags?: readonly string[];
}

/**
 * What the API's validation (`CreateLinkDto`, `UpdateLinkDto`) would reject in these fields:
 * a URL that is not http(s) or is too long, an empty or too long title, a too long note, too many
 * tags. Empty list: valid.
 */
export function linkFieldsProblems(fields: LinkFields): string[] {
  const problems: string[] = [];
  if (fields.url !== undefined) {
    const url = fields.url.trim();
    if (!isHttpUrl(url) || url.length > LINK_LIMIT.UrlMax) {
      problems.push('url must be an http(s) URL, at most 2048 characters');
    }
  }
  if (fields.title !== undefined) {
    const length = fields.title.trim().length;
    if (length < 1 || length > LINK_LIMIT.TitleMax) {
      problems.push('title must be 1 to 300 characters');
    }
  }
  if (typeof fields.note === 'string' && fields.note.length > LINK_LIMIT.NoteMax) {
    problems.push('note is too long');
  }
  if (fields.tags !== undefined && fields.tags.length > LINK_LIMIT.TagsMax) {
    problems.push('too many tags');
  }
  return problems;
}
