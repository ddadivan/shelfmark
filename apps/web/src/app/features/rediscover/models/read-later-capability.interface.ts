import type { LinkResponse } from '@shelfmark/contracts';

/** "Read later" (#396, not built yet): provided by that feature once it exists. */
export interface ReadLaterCapability {
  add(link: LinkResponse): Promise<void>;
}
