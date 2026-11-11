import type { LinkKind } from '@shelfmark/contracts';

export interface SeedLinkOptions {
  title?: string;
  url?: string;
  note?: string | null;
  folderId?: string | null;
  isFavorite?: boolean;
  createdAt?: Date;
  lastOpenedAt?: Date | null;
  /** Tag names; created for the user when missing. */
  tags?: string[];
  idempotencyKey?: string;
  /** One of `LINK_KIND`; the column default (`other`) when absent. */
  kind?: LinkKind;
}
