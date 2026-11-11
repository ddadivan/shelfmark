import type { FolderResponse } from '../folders/folder-response.interface';
import type { LinkResponse } from '../links/link-response.interface';
import type { PinKind } from './pin-kind.type';

/** One pinned item; exactly one of `folder` and `link` is set, matching `kind`. */
export interface PinResponse {
  kind: PinKind;
  /** 0-based place in the sidebar. */
  position: number;
  folder: FolderResponse | null;
  link: LinkResponse | null;
}
