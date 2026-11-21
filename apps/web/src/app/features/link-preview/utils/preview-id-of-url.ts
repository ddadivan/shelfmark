import { PREVIEW_QUERY_PARAM } from '../../../models/preview-query-param.const';

/** The link id of `?preview=` in a router URL, or `null` when the preview is closed (#553). */
export function previewIdOfUrl(url: string): string | null {
  const [beforeFragment = ''] = url.split('#');
  const start = beforeFragment.indexOf('?');
  if (start === -1) {
    return null;
  }
  const id = new URLSearchParams(beforeFragment.slice(start + 1)).get(PREVIEW_QUERY_PARAM);
  return id === null || id.trim() === '' ? null : id;
}
