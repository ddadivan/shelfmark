/**
 * The flags `withRemoteLoad` reads and writes; the store's state has them next to its data. A
 * type alias (not an interface) so it satisfies the feature's state constraint.
 */
export type RemoteLoadState = {
  loaded: boolean;
  loading: boolean;
  error: boolean;
};
