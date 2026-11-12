import { isFolderIconValue } from '@shelfmark/contracts';
import { ValidateBy } from 'class-validator';

/** A known icon name or exactly one emoji (one grapheme of emoji characters, #335); nothing else. */
export const IsFolderIcon = (): PropertyDecorator =>
  ValidateBy({
    name: 'isFolderIcon',
    validator: {
      validate: (value: unknown): boolean => isFolderIconValue(value),
      defaultMessage: (): string => 'icon must be a folder icon name or exactly one emoji',
    },
  });
