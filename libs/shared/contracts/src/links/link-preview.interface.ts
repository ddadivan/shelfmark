import type { LinkKind } from './link-kind.type';

/** Preview data extracted from a page; the request/response wrapper arrives with the links module. */
export interface LinkPreview {
  /** From `og:type` and the host (`deriveLinkKind`); the client sends it back as `CreateLinkRequest.kind`. */
  kind: LinkKind;
  /** Final URL after redirects; the input URL when the page could not be fetched. */
  url: string;
  /** Page title (at most 300 characters); the URL when none could be extracted. */
  title: string;
  description: string | null;
  /** Absolute http(s) URL of the Open Graph / Twitter image. */
  imageUrl: string | null;
  /** Absolute http(s) URL of the site icon. */
  faviconUrl: string | null;
}
