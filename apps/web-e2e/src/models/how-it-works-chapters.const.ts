import type { HowItWorksChapter } from './how-it-works-chapter.interface';

/**
 * The chapters of the promo videos as the dialog lists them (#330: seven, with their own times
 * per recording). Mirrors HOW_IT_WORKS_CHAPTERS in apps/web; the e2e project cannot import it.
 */
export const HOW_IT_WORKS_CHAPTERS: readonly HowItWorksChapter[] = [
  { title: 'Save a link', desktop: '0:00', phone: '0:00' },
  { title: 'Folders and tags', desktop: '0:33', phone: '0:27' },
  { title: 'Many at once', desktop: '1:10', phone: '0:59' },
  { title: 'Find it again', desktop: '1:41', phone: '1:22' },
  { title: 'Undo and Trash', desktop: '2:10', phone: '1:42' },
  { title: 'Make it yours', desktop: '2:27', phone: '1:56' },
  { title: 'Share and export', desktop: '2:57', phone: '2:15' },
];
