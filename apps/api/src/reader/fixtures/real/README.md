# Real article pages (Reader extraction test data)

Test data for `extract-reader-article.real.spec.ts` only. Kept as fetched (outside Prettier and
ESLint, see `.prettierignore` and `eslint.config.mjs`), apart from the trimming below. Fetched on
2026-11-25 with a plain `curl` (honest user agent, through the agent proxy).

Every file: `<script>`, `<style>`, stylesheet / preload links, HTML comments and the inner markup of
inline `<svg>` were removed (the extractor never reads them); data URIs over 200 characters were cut;
public client keys and tokens in `data-*` attributes were removed.

| File                    | Source URL                                                                       | Licence / terms and what was reduced                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `angular.html`          | https://angular.dev/guide/signals/resource                                       | angular.dev content is MIT licensed. Whole page. Fetched 2026-11-25.                                                                      |
| `mdn.html`              | https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch           | MDN content is CC BY-SA 2.5, code samples CC0. Whole page. Fetched 2026-11-25.                                                            |
| `webdev.html`           | https://web.dev/articles/lcp                                                     | Text CC BY 4.0, code Apache 2.0. Whole page. Fetched 2026-11-25.                                                                          |
| `wikibooks.html`        | https://en.wikibooks.org/wiki/Cookbook:Pancakes_(North_American)                 | Wikibooks text is CC BY-SA 4.0 (a recipe: ingredient list, numbered steps, infobox table). Whole page. Fetched 2026-11-25.                |
| `wikipedia.html`        | https://en.wikipedia.org/wiki/Trench_coat                                        | Wikipedia text is CC BY-SA 4.0 (a garment: history, figures with captions). Whole page. Fetched 2026-11-25.                               |
| `allbirds.html`         | https://www.allbirds.com/products/womens-tree-breezer-warm-camel-dark            | Product page of a shop (the site is in the project's allowed list for fixtures). Trimmed: JSON state attributes, text after about 9,000 characters (see below). Fetched 2026-11-25. |
| `taylorstitch.html`     | https://www.taylorstitch.com/products/sunset-cardigan-in-rust-terry-2611         | Product page of a shop (allowed list). Whole page apart from the general trimming. Fetched 2026-11-25.                                    |
| `medium-synthetic.html` | none                                                                             | **Synthetic**, written by hand in the structure of a Medium story (Medium answers `403` with a Cloudflare challenge). Not a real page.   |
| `github-synthetic.html` | none                                                                             | **Synthetic**, written by hand in the structure of a repository page with a README (the agent proxy refuses the real site). Not a real page. |

**Allbirds trimming:** after about 9,000 characters of page text, every later paragraph, list, quote,
code block, table and figure was removed and longer text nodes were cut to ten words; headings and
the whole page chrome are untouched.

The earlier excerpts of dev.to, Habr, overreacted, css-tricks and Smashing Magazine were removed
(2026-11-25): their texts have no licence for redistribution.

If a source asks for its page to be removed from this repository, delete the file and its entry in
the `PAGES` table of the spec.
