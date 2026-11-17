import { SUGGESTION_KIND } from '@shelfmark/contracts';

/** Translation keys of a Tidy chip's name, by kind: `on` while selected, `off` when left out. */
export const TIDY_CHIP_KEYS = {
  [SUGGESTION_KIND.Folder]: { on: 'ai.tidy.chip.folderAdded', off: 'ai.tidy.chip.folder' },
  [SUGGESTION_KIND.Tag]: { on: 'ai.tidy.chip.tagAdded', off: 'ai.tidy.chip.tag' },
  [SUGGESTION_KIND.NewTag]: { on: 'ai.tidy.chip.newTagAdded', off: 'ai.tidy.chip.newTag' },
} as const;
