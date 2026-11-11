import { LINK_LIMIT } from '@shelfmark/contracts';
import { stripControlChars } from '../common/validation/has-control-chars';

/**
 * The title to store: the cleaned page title, or the URL when the page gave none; cut to the title
 * limit by code points (a cut inside a surrogate pair would leave a lone half).
 */
export function titleOrUrl(title: string, url: string): string {
  const clean = stripControlChars(title).replace(/\s+/g, ' ').trim();
  return [...(clean === '' ? url : clean)].slice(0, LINK_LIMIT.TitleMax).join('');
}

/** The title a link gets when no page title is known: its URL, cut to the title limit. */
export function fallbackTitle(url: string): string {
  return titleOrUrl('', url);
}
