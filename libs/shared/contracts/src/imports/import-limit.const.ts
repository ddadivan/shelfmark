import { FOLDER_LIMIT } from '../folders/folder-limit.const';
import { LINK_LIMIT } from '../links/link-limit.const';

/**
 * Import limits (ADR 0056). `FileBytesMax` is the largest file the browser reads; `LinksMax` and
 * `FoldersMax` what one file may hold; `DepthMax` the folder levels kept below the target (deeper
 * folders join their deepest kept ancestor); `CheckBatchMax` the URLs of one duplicate check;
 * `FileNameMax` the stored file name; `OpenHours` how long an import takes batches; `UndoDays` how
 * long it can be undone and is listed; `RecentMax` the imports listed.
 */
export const IMPORT_LIMIT = {
  FileBytesMax: 50 * 1024 * 1024,
  LinksMax: LINK_LIMIT.PerUserMax,
  FoldersMax: FOLDER_LIMIT.PerUserMax,
  DepthMax: 8,
  CheckBatchMax: 500,
  FileNameMax: 255,
  OpenHours: 24,
  UndoDays: 7,
  RecentMax: 10,
} as const;
