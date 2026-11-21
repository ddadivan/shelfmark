import { PREVIEW_QUERY_PARAM } from '../../../models/preview-query-param.const';
import { isLibraryPath } from './is-library-path';

/**
 * The link id of `?preview=` on a library feed (`isLibraryPath`), or `null` when the preview is
 * closed or the page cannot show it (#553).
 */
export function previewIdOfUrl(url: string): string | null {
  const [beforeFragment = ''] = url.split('#');
  const start = beforeFragment.indexOf('?');
  if (start === -1 || !isLibraryPath(beforeFragment.slice(0, start))) {
    return null;
  }
  const id = new URLSearchParams(beforeFragment.slice(start + 1)).get(PREVIEW_QUERY_PARAM);
  return id === null || id.trim() === '' ? null : id;
}
