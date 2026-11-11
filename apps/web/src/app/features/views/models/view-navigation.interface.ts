import type { Params } from '@angular/router';

/** `router.navigate(commands, { queryParams })` that applies a saved view. */
export interface ViewNavigation {
  commands: string[];
  queryParams: Params;
}
