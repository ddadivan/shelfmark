/** The optional operations of an isolation scenario; each is provided or skipped with a reason. */
export const ISOLATION_OPERATION = {
  Update: 'update',
  Remove: 'remove',
  List: 'list',
  Reference: 'reference',
} as const;
