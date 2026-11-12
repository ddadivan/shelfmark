import { APP_PATH } from '../../../models/app-path.const';

/** The public address of a collection: `{origin}/c/{token}`. */
export function publicCollectionUrl(origin: string, token: string): string {
  return `${origin}/${APP_PATH.Collection}/${encodeURIComponent(token)}`;
}
