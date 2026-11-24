import type {
  CreateLinkRequest,
  GetSessionResponse,
  LinkLookupRequest,
  LinkLookupResponse,
  LinkResponse,
  ListFoldersResponse,
} from '@shelfmark/contracts';
import { REQUEST_TIMEOUT_MS } from '../app/core/api/models/request-timeout-ms.const';
import { SHELFMARK_ENDPOINT } from '../app/core/api/models/shelfmark-endpoint.const';
import { SHELFMARK_ORIGIN } from '../app/core/config/shelfmark-origin.const';
import { WorkerHttpError } from './worker-http-error';

async function messageOf(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('message' in body)) return '';
    const { message } = body;
    return typeof message === 'string' ? message : '';
  } catch {
    return '';
  }
}

/**
 * One Shelfmark call from the worker: the same routes, origin and limit as the popup's
 * `ShelfmarkApiService`. `credentials: 'include'` lets the browser attach the session cookie, and the
 * URL is always `SHELFMARK_ORIGIN`, the one host the manifest grants; the worker never reads the cookie.
 */
async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${SHELFMARK_ORIGIN}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new WorkerHttpError(response.status, await messageOf(response));
  return (await response.json()) as T;
}

/** The API calls a right-click save makes, a subset of the popup's. */
export const workerApi = {
  session: (): Promise<GetSessionResponse> => call(SHELFMARK_ENDPOINT.Session),
  folders: (): Promise<ListFoldersResponse> => call(SHELFMARK_ENDPOINT.Folders),
  lookup: (body: LinkLookupRequest): Promise<LinkLookupResponse> =>
    call(SHELFMARK_ENDPOINT.LinkLookup, body),
  create: (body: CreateLinkRequest): Promise<LinkResponse> => call(SHELFMARK_ENDPOINT.Links, body),
};
