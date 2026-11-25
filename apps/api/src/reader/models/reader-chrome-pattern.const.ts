/**
 * Markup that names page chrome whatever the pass: visually hidden text for screen readers (a
 * heading's "Permalink to ..."), custom elements of docs sites (`docs-table-of-contents`,
 * `app-breadcrumb`) and the class of an author's "edit this page" or "copy" control.
 */
export const READER_CHROME_PATTERN = {
  /** Class words of text only a screen reader gets. */
  Hidden:
    /(?:^|[\s_-])(?:sr-only|visually-hidden|visuallyhidden|screen-reader-text|screenreader|a11y-hidden|offscreen|skip-link|skip-to-content)(?:[\s_-]|$)/i,
  /** Whole class names of elements the page's CSS hides (utility classes) or pins over the page (modals). */
  HiddenClass: /(?:^|\s)(?:hidden|d-none|is-hidden|u-hidden|fixed)(?:\s|$)/i,
  /** A custom element (its tag has a hyphen) named like a nav, a TOC, a footer or a share bar. */
  CustomTag:
    /(?:^|-)(?:toc|table-of-contents|breadcrumbs?|navigation|nav|sidebar|footer|header|menu|search|cookie|banner|toolbar|share|pagination|feedback|related)(?:-|$)/i,
  /** An `<article>` that is a card of a listing (related posts, teasers), not the article. */
  Card: /card|teaser|snippet|excerpt|mini-post|related|preview/i,
  /**
   * Whole class names (or ids) of controls and meta lines inside the article: edit links, copy
   * buttons, tables of contents, bylines. Whole names only: `docs-with-TOC` on a layout wrapper is
   * not a table of contents.
   */
  Control:
    /(?:^|\s)(?:edit-page|edit-this-page|edit-link|docs-github-links|copy-button|copy-code|copy-to-clipboard|clipboard|toc|toc-container|toc-wrapper|docs-toc|page-toc|post-toc|table-of-contents|on-this-page|breadcrumbs?|page-actions|back-to-top|print-only|example-header|meta-container|post-meta|entry-meta|article-meta|byline|reading-time|article-labels|publication-hubs|publication-snippet-controls|tm-user-info|meta-box|c-garfield-aside--meta|reference|mw-editsection|hatnote|catlinks|printfooter|navbox|reflist|mw-references-wrap)(?:\s|$)/i,
} as const;
