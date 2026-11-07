/** What happens to the links of a deleted folder (`DELETE /api/folders/:id?mode=`). */
export const FOLDER_DELETE_MODE = {
  DeleteLinks: 'delete-links',
  MoveToUnsorted: 'move-to-unsorted',
} as const;
