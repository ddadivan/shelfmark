import type { LinkResponse } from '@shelfmark/contracts';
import { hasPendingImages } from '../features/links/utils/link-view';
import type { LinkImageCaptureDeps } from './models/link-image-capture-deps.interface';

/** Image capture requests in flight at once (the endpoint shares the AddLink rate limit). */
const CAPTURE_CONCURRENCY = 3;

/**
 * Asks the server to re-capture the images of loaded links that carry the pending marker (their
 * page changed), once per link and session, at most `CAPTURE_CONCURRENCY` at a time so a page
 * of pending links does not burst the AddLink rate limit. A failure is silent: the card keeps
 * the letter.
 */
export function createLinkImageCapture(deps: LinkImageCaptureDeps) {
  // Links whose capture was requested: one request per link until it is done.
  const requested = new Set<string>();
  const queue: LinkResponse[] = [];
  let inFlight = 0;

  /** Queues the links among `links` that are pending and not asked about yet. */
  function note(links: readonly LinkResponse[]): void {
    for (const link of links) {
      if (hasPendingImages(link) && !requested.has(link.id)) {
        requested.add(link.id);
        queue.push(link);
      }
    }
    pump();
  }

  function pump(): void {
    while (inFlight < CAPTURE_CONCURRENCY) {
      const next = queue.shift();
      if (next === undefined) {
        return;
      }
      inFlight++;
      void capture(next).finally(() => {
        inFlight--;
        pump();
      });
    }
  }

  /** The response is applied only while the link is still the version that was asked about. */
  async function capture(asked: LinkResponse): Promise<void> {
    const { id } = asked;
    const started = deps.epoch();
    try {
      const saved = await deps.request(id);
      if (started !== deps.epoch() || deps.isHidden(id)) {
        return;
      }
      const current = deps.current(id);
      if (current?.updatedAt === asked.updatedAt && hasPendingImages(current)) {
        // The capture also fills in the page title of a link saved without one (paste many);
        // a title the user changed meanwhile is a newer `updatedAt` and never reaches here.
        deps.apply(id, {
          faviconUrl: saved.faviconUrl,
          imageUrl: saved.imageUrl,
          ...(current.title === asked.title && { title: saved.title }),
        });
      } else if (current !== undefined && hasPendingImages(current)) {
        // Edited to another page while the request ran: that version is pending in its own right.
        requested.delete(id);
        note([current]);
      }
      // Done (or superseded): a later edit that makes the link pending again may ask again.
      requested.delete(id);
    } catch {
      // No toast: the capture is a courtesy, the card falls back to the site letter.
    }
  }

  return {
    note,
    /** Sign-out: forgets what was asked and drops what is still queued. */
    clear(): void {
      requested.clear();
      queue.length = 0;
    },
  };
}
