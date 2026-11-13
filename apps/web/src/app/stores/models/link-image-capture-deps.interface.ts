import type { LinkResponse } from '@shelfmark/contracts';

/** What the image capture queue needs from the links store. */
export interface LinkImageCaptureDeps {
  /** Asks the server to re-capture the images of one link. */
  readonly request: (id: string) => Promise<LinkResponse>;
  /** The loaded copy of a link (feed or recent list). */
  readonly current: (id: string) => LinkResponse | undefined;
  /** The link sits in its Undo window: its answer is not applied. */
  readonly isHidden: (id: string) => boolean;
  /** Changes on every sign-out: an answer that started before it is dropped. */
  readonly epoch: () => number;
  /** Writes the captured fields into the loaded copies. */
  readonly apply: (id: string, changes: Partial<LinkResponse>) => void;
}
