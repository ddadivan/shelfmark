import type { ReaderFont } from '@shelfmark/ui';

/** The font token each Font option of Reading settings is set in (its label shows the font). */
export const READER_FONT_FAMILY: Readonly<Record<ReaderFont, string>> = {
  sans: 'var(--font-sans)',
  serif: 'var(--font-serif)',
  readable: 'var(--font-readable)',
};
