import type { MockAskTheme } from './mock-ask-theme.interface';

/** The API mock's canned answers (`apps/api/src/ai/models/mock-ask-themes.const.ts`), word for word. */
export const MOCK_ASK_THEMES: readonly MockAskTheme[] = [
  {
    triggers: ['ramen', 'noodle'],
    sourceWords: ['ramen', 'noodle', 'noodles', 'broth'],
    intro: 'You saved a few ramen recipes.',
    lines: [
      '{title} is the quickest one for a weeknight.',
      'For a slow, rich broth, {title} goes step by step.',
      '{title} covers the toppings.',
    ],
  },
  {
    triggers: ['coat', 'coats', 'jacket'],
    sourceWords: ['coat', 'coats', 'jacket', 'parka', 'wool'],
    intro: 'You were comparing two coats.',
    lines: [
      'The first is {title}.',
      'The other is {title}, which you saved a little later.',
      '{title} is another option you kept.',
    ],
  },
  {
    triggers: ['signal', 'signals'],
    sourceWords: ['signal', 'signals'],
    intro: 'Your Angular links cover signals.',
    lines: [
      '{title} explains writable signals, computed values and effects.',
      '{title} shows them in practice.',
      'There is more in {title}.',
    ],
  },
];
