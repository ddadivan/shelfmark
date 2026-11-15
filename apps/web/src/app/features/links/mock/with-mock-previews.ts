import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';

/** The captured-image version the mock answers (a hash prefix like the API's). */
const MOCK_IMAGE_VERSION = '0123456789abcdef';

function previewsWanted(): boolean {
  try {
    return (
      globalThis.sessionStorage.getItem(MOCK_LINKS_SCENARIO_KEY) === MOCK_LINKS_SCENARIO.Previews
    );
  } catch {
    return false;
  }
}

/**
 * In the `previews` scenario (#418) every link gets a captured preview path, so the folder cover
 * and the picture thumbnails can be tried and tested; otherwise the links are returned as they are.
 */
export function withMockPreviews(links: LinkResponse[], wanted = previewsWanted()): LinkResponse[] {
  return wanted
    ? links.map((link) => ({
        ...link,
        imageUrl: `/api/links/${link.id}/image?v=${MOCK_IMAGE_VERSION}`,
      }))
    : links;
}
