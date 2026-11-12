import { FOLDER_EMOJI_MAX_CODE_POINTS } from './folder-emoji-max.const';
import type { FolderEmoji } from './folder-emoji.type';

/** One emoji unit: a pictographic with emoji presentation (or VS16), an optional skin tone. */
const UNIT = String.raw`(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}️)\p{Emoji_Modifier}?`;
/**
 * The whole value: a flag (two regional indicators), a keycap, or units joined by ZWJ, optionally
 * with a tag sequence (the flags of England, Scotland and Wales). No other characters.
 */
const EMOJI = new RegExp(
  String.raw`^(?:\p{Regional_Indicator}{2}|[0-9#*]️?⃣|${UNIT}[\u{E0020}-\u{E007F}]*(?:‍${UNIT})*)$`,
  'u',
);

/**
 * True for exactly one emoji: at most `FOLDER_EMOJI_MAX_CODE_POINTS` code points, a single
 * grapheme (`Intl.Segmenter`) made only of emoji characters. Letters, digits, spaces, control
 * characters, markup and several emoji are all rejected.
 */
export function isFolderEmoji(value: unknown): value is FolderEmoji {
  if (typeof value !== 'string' || value === '') {
    return false;
  }
  if ([...value].length > FOLDER_EMOJI_MAX_CODE_POINTS || !EMOJI.test(value)) {
    return false;
  }
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)];
  return segments.length === 1;
}
