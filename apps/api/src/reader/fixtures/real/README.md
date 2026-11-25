# Real article pages (Reader extraction test data)

Test data for `extract-reader-article.real.spec.ts` only. Kept as fetched (outside Prettier and
ESLint, see `.prettierignore` and `eslint.config.mjs`), apart from the trimming below. Fetched on
2026-11-25 with a plain `curl` (honest user agent, through the agent proxy).

Every file: `<script>`, `<style>`, stylesheet / preload links, HTML comments and the inner markup of
inline `<svg>` were removed (the extractor never reads them); data URIs over 200 characters were cut.

| File                     | Source URL                                                                           | Licence / terms and what was reduced                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `angular.html`           | https://angular.dev/guide/signals/resource                                           | angular.dev content is MIT licensed. Whole page.                                                      |
| `mdn.html`               | https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch               | MDN content is CC BY-SA 2.5, code samples CC0. Whole page.                                            |
| `webdev.html`            | https://web.dev/articles/lcp                                                         | Text CC BY 4.0, code Apache 2.0. Whole page.                                                          |
| `devto.html`             | https://dev.to/sylwia-lask/mcp-is-dead-simple-and-thats-exactly-the-problem-5811     | Author's copyright, no licence stated: **excerpt** (see below) and comments cut to two entries.       |
| `habr.html`              | https://habr.com/ru/articles/1111954/                                                | Author's copyright, no licence stated: **excerpt** (see below).                                       |
| `overreacted.html`       | https://overreacted.io/a-complete-guide-to-useeffect/                                | Author's copyright, no licence stated: **excerpt** (see below).                                       |
| `csstricks.html`         | https://css-tricks.com/snippets/css/a-guide-to-flexbox/                              | Publisher's copyright, no licence stated: **excerpt** (see below) and comments cut to two entries.    |
| `smashing.html`          | https://www.smashingmagazine.com/2026/10/embracing-playful-imperfection-css-random-function/ | Publisher's / author's copyright, no licence stated: **excerpt** (see below).                |
| `medium-synthetic.html`  | none                                                                                 | **Synthetic**, written by hand in the structure of a Medium story (Medium answers `403` with a Cloudflare challenge). Not a real page. |
| `github-synthetic.html`  | none                                                                                 | **Synthetic**, written by hand in the structure of a repository page with a README (the agent proxy refuses `github.com`). Not a real page. |

**Excerpt:** for the pages without a licence only the opening of the article stays. After about
9,000 characters of page text, every later paragraph, list, quote, code block, table and figure was
removed and longer text nodes were cut to ten words; headings, the whole page chrome (navigation,
footers, sidebars, share bars) and the first paragraphs are untouched. Comment trees (other people's
names and texts) were cut to two entries so that the comment markup is still there to be ignored.

If a source asks for its page to be removed from this repository, delete the file and its entry in
the `PAGES` table of the spec.
