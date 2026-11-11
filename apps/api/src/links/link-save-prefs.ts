import { LIBRARY_SETTINGS_DEFAULT, stripTrackingParams } from '@shelfmark/contracts';
import type { LinkDbClient } from './models/link-db-client.type';
import type { LinkSavePrefs } from './models/link-save-prefs.interface';

/** The save choices of the session user; the defaults when the row is gone (the save then 404s or fails anyway). */
export async function readLinkSavePrefs(db: LinkDbClient, userId: string): Promise<LinkSavePrefs> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { fetchPreviews: true, keepQuery: true },
  });
  return (
    row ?? {
      fetchPreviews: LIBRARY_SETTINGS_DEFAULT.fetchPreviews,
      keepQuery: LIBRARY_SETTINGS_DEFAULT.keepQuery,
    }
  );
}

/** The address to store: as sent, or without its tracking parameters when "Keep the query part" is off. */
export function savedUrl(url: string, prefs: LinkSavePrefs): string {
  return prefs.keepQuery ? url : stripTrackingParams(url);
}
