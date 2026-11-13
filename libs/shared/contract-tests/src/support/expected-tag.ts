import { ANY } from './any.const';

/** The expected `TagResponse`; `fields` override single fields (an exact `id`). */
export function expectedTag(
  name: string,
  linkCount = 0,
  fields: Record<string, unknown> = {},
): Record<string, unknown> {
  return { id: ANY.id, name, linkCount, createdAt: ANY.time, updatedAt: ANY.time, ...fields };
}
