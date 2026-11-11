import type { Prisma } from '../../generated/prisma/client';

/** A `saved_views` row as the service reads it (`query` is parsed by `parseStoredQuery`). */
export interface SavedViewRow {
  id: string;
  name: string;
  query: Prisma.JsonValue;
  position: number;
}
