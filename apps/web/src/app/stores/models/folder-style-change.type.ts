import type { UpdateFolderRequest } from '@shelfmark/contracts';

/** What the "Colour and icon" dialog changes on a folder (#418 adds the description and cover, #440 the highlight). */
export type FolderStyleChange = Pick<
  UpdateFolderRequest,
  'colour' | 'icon' | 'highlighted' | 'description' | 'coverLinkId'
>;
