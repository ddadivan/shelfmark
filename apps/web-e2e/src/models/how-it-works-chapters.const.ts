import type { HowItWorksChapter } from './how-it-works-chapter.interface';

/**
 * The chapters of the promo videos as the dialog lists them (#330: seven, with their own times
 * per recording). Mirrors HOW_IT_WORKS_CHAPTERS in apps/web; the e2e project cannot import it.
 */
export const HOW_IT_WORKS_CHAPTERS: readonly HowItWorksChapter[] = [
  { title: 'Save a link', desktop: '0:00', phone: '0:00' },
  { title: 'Folders and tags', desktop: '0:33', phone: '0:27' },
  { title: 'Many at once', desktop: '1:09', phone: '0:58' },
  { title: 'Find it again', desktop: '1:40', phone: '1:21' },
  { title: 'Undo and Trash', desktop: '2:09', phone: '1:42' },
  { title: 'Make it yours', desktop: '2:26', phone: '1:56' },
  { title: 'Share and export', desktop: '2:55', phone: '2:15' },
];
