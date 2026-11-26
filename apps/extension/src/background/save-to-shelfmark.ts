import {
  isStorableUrl,
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  type FolderResponse,
  type LinkLookupResponse,
} from '@shelfmark/contracts';
import { withoutFragment } from '../app/popup/utils/without-fragment';
import { SAVE_OUTCOME } from './models/save-outcome.const';
import type { SaveOutcome } from './models/save-outcome.type';
import type { SaveResult } from './models/save-result.interface';
import { workerApi } from './worker-api';
import { WorkerHttpError } from './worker-http-error';

const UNAUTHORIZED = 401;

const result = (outcome: SaveOutcome, folderName: string | null = null): SaveResult => ({
  outcome,
  folderName,
});

/** What a failed call means: 401 is signed out, a full library has its own words, else Failed. */
function toOutcome(error: unknown): SaveOutcome {
  if (!(error instanceof WorkerHttpError)) return SAVE_OUTCOME.Failed;
  if (error.status === UNAUTHORIZED) return SAVE_OUTCOME.SignedOut;
  const full =
    error.serverMessage.startsWith(LINK_ERROR_MESSAGE.LimitReached) ||
    error.serverMessage.startsWith(LINK_ERROR_MESSAGE.DemoLimitReached);
  return full ? SAVE_OUTCOME.LibraryFull : SAVE_OUTCOME.Failed;
}

/**
 * The popup's duplicate check: the address without its #fragment. It never blocks the save: any
 * failure but a 401 counts as "not saved yet".
 */
async function lookup(url: string): Promise<LinkLookupResponse> {
  try {
    return await workerApi.lookup({ url: withoutFragment(url) });
  } catch (error: unknown) {
    if (toOutcome(error) === SAVE_OUTCOME.SignedOut) throw error;
    return { link: null };
  }
}

/**
 * A right-click save, the popup's flow without the form: the session (signed out stops here), the
 * duplicate check (a saved address is not saved twice; the user can still "Save a copy" in the
 * popup), then `POST /api/links`. No folder or tags are sent and `applyRules` is left at its default,
 * so the server files the link the way the popup's form would have shown it: the matching domain
 * rule's folder and tags, else Unsorted. Only the address and, for a page, the tab title are sent.
 */
export async function saveToShelfmark(url: string, title: string | null): Promise<SaveResult> {
  if (!isStorableUrl(url)) return result(SAVE_OUTCOME.Unsupported);
  try {
    const session = await workerApi.session();
    if (session === null) return result(SAVE_OUTCOME.SignedOut);
    const [folders, existing] = await Promise.all([workerApi.folders(), lookup(url)]);
    const folderName = (id: string | null): string | null =>
      id === null
        ? null
        : (folders.items.find((folder: FolderResponse) => folder.id === id)?.name ?? null);
    if (existing.link !== null) {
      return result(SAVE_OUTCOME.AlreadySaved, folderName(existing.link.folderId));
    }
    const link = await workerApi.create({
      url,
      ...(title !== null && title !== '' && { title: title.slice(0, LINK_LIMIT.TitleMax) }),
      idempotencyKey: crypto.randomUUID(),
    });
    return result(SAVE_OUTCOME.Saved, folderName(link.folderId));
  } catch (error: unknown) {
    return result(toOutcome(error));
  }
}
