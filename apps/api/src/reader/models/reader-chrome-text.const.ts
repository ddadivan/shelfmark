/**
 * Whole texts of a heading or short paragraph that are page chrome. `Skip` drops the block (and a
 * list right after a heading of it: the table of contents); `End` ends the article (comments and
 * related lists come after the text).
 */
export const READER_CHROME_TEXT = {
  Skip: /^(?:(?:.{1,40}\s)?table of contents|(?:.{1,40}\s)?on this page|in this article|in this guide|table of contents|contents|edit this page|edit page|suggest an edit|share|share this|share this (?:article|page|post)|copy|copy link|copy code|copied|back to top|skip to (?:main )?content|was this (?:page |article |guide )?helpful|jump to|sign up|follow|subscribe|print|listen)$/i,
  End: /^(?:(?:top )?comments?(?: \(?\d+\)?)?|\d+ comments?|leave a (?:reply|comment)|related (?:articles?|posts?|reading|content|topics|links?)|(?:you )?(?:may|might|could) (?:also )?like|more (?:articles|posts|stories|from .{1,40}|to read)|read next|recommended(?: for you| reading)?|discussion|about the authors?|share (?:this|your) .{1,40}|stay (?:up to date|in touch|tuned).{0,40}|newsletter|subscribe(?: to .{1,40})?|tags?|hubs|some comments may only be visible.{0,80}|теги|хабы|(?:also )?see also|further reading|more on this topic|latest (?:articles|posts))$/i,
} as const;
