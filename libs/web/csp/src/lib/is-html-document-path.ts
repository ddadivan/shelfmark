import { HTML_MATCHER } from './models/html-matcher.const';

const HTML_PATTERNS = HTML_MATCHER.map((source) => new RegExp(`^${source}$`));

/** True for the paths that get the app shell: `/`, extensionless non-API paths, `/index.html`. */
export function isHtmlDocumentPath(pathname: string): boolean {
  return HTML_PATTERNS.some((pattern) => pattern.test(pathname));
}
