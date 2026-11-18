/** Called after a committed tag rename, delete or merge changed what some of the user's links carry. */
export type TagLinksChangedListener = (userId: string) => Promise<void>;
