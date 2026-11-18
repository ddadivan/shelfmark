import type { LinkResponse } from '@shelfmark/contracts';

/** What the mock search by meaning compares for one link: its text as stems (never the URL). */
export interface MockMeaningDoc {
  readonly link: LinkResponse;
  readonly folderName: string | null;
  readonly stems: ReadonlySet<string>;
}
