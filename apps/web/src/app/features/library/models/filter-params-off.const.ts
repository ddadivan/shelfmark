import { FAVORITE_QUERY_PARAM } from '../../links/models/favorite-query-param.const';
import { KIND_QUERY_PARAM } from '../../links/models/kind-query-param.const';
import { SAVED_QUERY_PARAM } from '../../links/models/saved-query-param.const';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';

/** The query of every Filter setting turned off (type, saved, tags, favorites). */
export const FILTER_PARAMS_OFF: Readonly<Record<string, null>> = {
  [TAG_QUERY_PARAM]: null,
  [KIND_QUERY_PARAM]: null,
  [SAVED_QUERY_PARAM]: null,
  [FAVORITE_QUERY_PARAM]: null,
};
