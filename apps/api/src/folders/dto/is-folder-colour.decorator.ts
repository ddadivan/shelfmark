import { isFolderColourValue } from '@shelfmark/contracts';
import { ValidateBy } from 'class-validator';

/** A built-in colour name or an own lower-case `#rrggbb` (#335); nothing else. */
export const IsFolderColour = (): PropertyDecorator =>
  ValidateBy({
    name: 'isFolderColour',
    validator: {
      validate: (value: unknown): boolean => isFolderColourValue(value),
      defaultMessage: (): string =>
        'colour must be a folder colour name or a lower-case #rrggbb colour',
    },
  });
