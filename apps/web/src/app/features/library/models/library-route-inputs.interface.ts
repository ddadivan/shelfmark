import type { Signal } from '@angular/core';
import type { LinksScope } from '../../links/models/links-scope.type';

/** The route-bound inputs of the library page, handed to its page-scoped services as signals. */
export interface LibraryRouteInputs {
  /** From the route data. */
  readonly scope: Signal<LinksScope>;
  /** From the route (`folders/:folderId`). */
  readonly folderId: Signal<string | undefined>;
  /** From the query (`?tag=a&tag=b`): one value or a list; see `parseTagFilter`. */
  readonly tag: Signal<string | readonly string[] | undefined>;
  /** From the query (`?q=signal store`): the search text; see `parseSearchQuery`. */
  readonly q: Signal<unknown>;
  /** From the query (`?sort=oldest`): see `parseFeedSort`. */
  readonly sort: Signal<unknown>;
  /** From the query (`?kind=video`): see `parseLinkKind`. */
  readonly kind: Signal<unknown>;
}
