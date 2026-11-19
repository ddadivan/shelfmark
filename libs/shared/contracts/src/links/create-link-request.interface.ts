import type { LinkKind } from './link-kind.type';

/** `POST /api/links` body. Duplicates are allowed ("save anyway"). */
export interface CreateLinkRequest {
  /**
   * Usually `LinkPreview.kind` (the client had the preview) or the user's choice. When absent the server
   * derives it: from the page it fetched (no `title`) or else from the host (ADR 0038).
   */
  kind?: LinkKind;
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /** At most `LINK_LIMIT.TitleMax`; defaults to the page title (fetched by the server) or the URL. */
  title?: string;
  /** At most `LINK_LIMIT.NoteMax`. */
  note?: string;
  /** UUID of one of the user's folders. */
  folderId?: string;
  /**
   * Tag names, at most `LINK_LIMIT.TagsMax` of them and `TAG_LIMIT.NameMax` characters each; missing tags are
   * created. Names are normalised (spaces become hyphens) and unique case-insensitively.
   */
  tags?: string[];
  /**
   * Client-generated UUID, one per "add link" dialog session. A repeated request with the same key returns
   * the link created by the first one instead of a second copy (retries, double clicks). Unique per user.
   */
  idempotencyKey?: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`), usually from the preview; the server never fetches it. */
  faviconUrl?: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`), usually from the preview; the server never fetches it. */
  imageUrl?: string;
  /**
   * Domain rules (#398), default `true`: the rule matching the URL fills what this save leaves open,
   * the folder when `folderId` is absent and the tags when none are sent. `false` when the client
   * showed the rule and the user removed it (a form sends what it showed, so nothing is applied twice).
   */
  applyRules?: boolean;
  /**
   * The summary of the new link, like `UpdateLinkRequest.summary` (#507):
   * - text (at most `AI_LIMIT.SummaryMax`): the user's own summary, written or edited in Add link;
   *   stored as theirs (AI never replaces it);
   * - `null`: no summary. The user cleared the AI text in Add link, so the link is saved without one
   *   and AI does not add one for this save (neither the draft's nor a new job's);
   * - left out (or blank): the save asks nothing of its own, so AI's summary (the draft's, or a new
   *   job's while summaries are on) is applied as AI's.
   */
  summary?: string | null;
  /**
   * The Add link dialog's AI draft id (`CreateAiDraftRequest.draftId`, a UUID): the save picks up that
   * draft's suggestions and summary instead of starting a new AI job. Separate from `idempotencyKey`.
   */
  aiDraftId?: string;
}
