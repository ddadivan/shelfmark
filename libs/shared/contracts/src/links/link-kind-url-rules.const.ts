import { LINK_KIND } from './link-kind.const';
import type { LinkKindUrlRule } from './link-kind-url-rule.interface';

/**
 * Hosts and paths whose kind is certain whatever the page says about itself (#537, ADR 0058): a
 * LinkedIn post calls itself an `article`, a repository an `object`. Checked in order before
 * `og:type`; the first match wins. Paths are matched lower case, so rules are written lower case.
 */
export const LINK_KIND_URL_RULES: readonly LinkKindUrlRule[] = [
  {
    kind: LINK_KIND.Podcast,
    hosts: ['open.spotify.com'],
    path: /^\/(?:[a-z-]+\/)?(?:episode|show)\//,
  },
  { kind: LINK_KIND.Podcast, hosts: ['podcasts.apple.com'] },
  {
    kind: LINK_KIND.Document,
    hosts: ['docs.google.com'],
    path: /^\/(?:document|presentation|spreadsheets)\//,
  },
  { kind: LINK_KIND.Document, hosts: ['slideshare.net', 'speakerdeck.com'] },
  {
    kind: LINK_KIND.Code,
    hosts: ['github.com', 'gitlab.com', 'npmjs.com', 'bitbucket.org', 'pypi.org'],
  },
  { kind: LINK_KIND.App, hosts: ['apps.apple.com', 'chromewebstore.google.com'] },
  { kind: LINK_KIND.App, hosts: ['play.google.com'], path: /^\/store\/apps\// },
  { kind: LINK_KIND.App, hosts: ['chrome.google.com'], path: /^\/webstore\// },
  { kind: LINK_KIND.Post, hosts: ['x.com', 'twitter.com'], path: /^\/[^/]+\/status(?:es)?\/\d+/ },
  { kind: LINK_KIND.Post, hosts: ['threads.net', 'threads.com'], path: /^\/@[^/]+\/post\// },
  { kind: LINK_KIND.Post, hosts: ['linkedin.com'], path: /^\/(?:posts|feed\/update)\// },
  { kind: LINK_KIND.Post, hosts: ['reddit.com'], path: /^\/r\/[^/]+\/comments\// },
  { kind: LINK_KIND.Post, hosts: ['bsky.app'], path: /^\/profile\/[^/]+\/post\// },
];
