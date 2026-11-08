import { API_GLOBAL_PREFIX } from '../../src/app/models/api-global-prefix.const';
import { FIXTURE_ROUTE } from './fixture-route.const';

/** Full request paths of the test fixtures, for specs. */
export const FIXTURE_PATH = {
  Notes: `/${API_GLOBAL_PREFIX}/${FIXTURE_ROUTE.Notes}`,
  NotesCopy: `/${API_GLOBAL_PREFIX}/${FIXTURE_ROUTE.Notes}/copy`,
  WhoAmI: `/${API_GLOBAL_PREFIX}/${FIXTURE_ROUTE.WhoAmI}`,
  LeakyNotes: `/${API_GLOBAL_PREFIX}/${FIXTURE_ROUTE.LeakyNotes}`,
  CookieGate: `/${API_GLOBAL_PREFIX}/${FIXTURE_ROUTE.CookieGate}`,
} as const;
