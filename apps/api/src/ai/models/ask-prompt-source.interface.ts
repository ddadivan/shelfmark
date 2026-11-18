/**
 * One retrieved link of the session user as the model sees it (ADR 0052 point 4): stored fields only,
 * capped by `buildAskUserPrompt`; never ids, full URLs or page text.
 */
export interface AskPromptSource {
  /** 1-based number the model cites as `[n]`. */
  n: number;
  title: string;
  /** Host without `www.`. */
  host: string;
  /** URL path without query or fragment. */
  path: string;
  folderName: string | null;
  tagNames: string[];
  summary: string | null;
  savedAt: Date;
  /** Only when "Include my notes" is on (the caller decides). */
  note: string | null;
}
