import { PREVIEW_HOST_PATTERN } from './preview-host-pattern.const';

/** True for a host that may be stored in `previewNewTabHosts` (`PREVIEW_HOST_PATTERN`). */
export function isPreviewHost(value: unknown): value is string {
  return typeof value === 'string' && PREVIEW_HOST_PATTERN.test(value);
}
