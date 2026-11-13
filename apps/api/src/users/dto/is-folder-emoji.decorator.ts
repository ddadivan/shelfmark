import { isFolderEmoji } from '@shelfmark/contracts';
import { ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * Exactly one emoji (one grapheme of emoji characters, at most `FOLDER_EMOJI_MAX_CODE_POINTS`
 * code points, #363); letters, spaces, markup and several emoji are refused. Pass `{ each: true }`
 * for a list.
 */
export const IsFolderEmoji = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'isFolderEmoji',
      validator: {
        validate: (value: unknown): boolean => isFolderEmoji(value),
        defaultMessage: (): string => 'each emoji must be exactly one emoji',
      },
    },
    options,
  );
