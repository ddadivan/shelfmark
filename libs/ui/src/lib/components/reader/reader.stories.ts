import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { READER_FONT } from './models/reader-font.const';
import { READER_LINE_WIDTH } from './models/reader-line-width.const';
import { READER_LINE_SPACING } from './models/reader-line-spacing.const';
import { READER_TEXT_SIZE } from './models/reader-text-size.const';
import { READER_THEME } from './models/reader-theme.const';
import { READER_VIEW_BLOCK } from './models/reader-block-kind.const';
import type { ReaderViewBlock } from './models/reader-view-block.interface';
import { ReaderComponent } from './reader.component';

const BLOCKS: ReaderViewBlock[] = [
  {
    kind: READER_VIEW_BLOCK.Paragraph,
    text: 'Zoneless change detection lets an Angular app update the screen without zone.js. Changes come from signals and explicit events instead of patching every browser API.',
    items: [],
    imageUrl: null,
  },
  { kind: READER_VIEW_BLOCK.Heading, text: 'What you gain', items: [], imageUrl: null },
  {
    kind: READER_VIEW_BLOCK.Paragraph,
    text: 'Smaller bundles, cleaner stack traces and fewer surprise renders.',
    items: [],
    imageUrl: null,
  },
  {
    kind: READER_VIEW_BLOCK.List,
    text: '',
    items: ['Move component state to signals.', 'Check third-party libraries that expect zone.js.'],
    imageUrl: null,
  },
  {
    kind: READER_VIEW_BLOCK.Quote,
    text: 'Start with a leaf feature, measure, then move inward.',
    items: [],
    imageUrl: null,
  },
  {
    kind: READER_VIEW_BLOCK.Code,
    text: 'provideZonelessChangeDetection()',
    items: [],
    imageUrl: null,
  },
];

const meta: Meta<ReaderComponent> = {
  title: 'Components/Reader',
  component: ReaderComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An article as clean text (Shelf ReaderView): a 2px progress line, the site, the title in the reading font, ' +
          'author, date and reading time, the summary slot, then typed blocks rendered as text, never HTML. The host ' +
          'scrolls and emits `progressed`. Reading settings: `textSize` (14 to 24px), `font`, `lineSpacing`, ' +
          '`width` and `theme` (Light, Sepia, Dark, Black: fixed palettes; none follows the app theme).',
      },
    },
  },
  argTypes: {
    textSize: {
      control: { type: 'range', min: READER_TEXT_SIZE.Min, max: READER_TEXT_SIZE.Max, step: 1 },
    },
    font: { control: 'inline-radio', options: Object.values(READER_FONT) },
    lineSpacing: { control: 'inline-radio', options: Object.values(READER_LINE_SPACING) },
    width: { control: 'inline-radio', options: Object.values(READER_LINE_WIDTH) },
    theme: { control: 'inline-radio', options: [null, ...Object.values(READER_THEME)] },
  },
  args: {
    site: 'angular.dev',
    faviconLetter: 'a',
    heading: 'Zoneless change detection',
    meta: 'Angular team · 2 Oct 2026 · 5 min read',
    notice: '',
    blocks: BLOCKS,
    textSize: READER_TEXT_SIZE.Default,
    font: READER_FONT.Sans,
    lineSpacing: READER_LINE_SPACING.Normal,
    width: READER_LINE_WIDTH.Normal,
    theme: null,
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-reader style="block-size: 32rem" [site]="site" [faviconLetter]="faviconLetter" [heading]="heading"
        [meta]="meta" [notice]="notice" [blocks]="blocks" [textSize]="textSize" [font]="font"
        [lineSpacing]="lineSpacing" [width]="width" [theme]="theme" />`,
  }),
};

export default meta;
type Story = StoryObj<ReaderComponent>;

export const Default: Story = {};

/** The Sepia theme with the serif font, 20px text and relaxed spacing. */
export const SepiaSerif: Story = {
  args: {
    theme: READER_THEME.Sepia,
    font: READER_FONT.Serif,
    textSize: 20,
    lineSpacing: READER_LINE_SPACING.Relaxed,
  },
};

/** The Black theme (OLED), narrow lines and compact spacing. */
export const BlackNarrow: Story = {
  args: {
    theme: READER_THEME.Black,
    width: READER_LINE_WIDTH.Narrow,
    lineSpacing: READER_LINE_SPACING.Compact,
  },
};

/** A page without article text: the notice, no meta and no blocks. */
export const NoArticle: Story = {
  args: {
    notice:
      'This page has no article text. Reader shows the picture, what the page says about itself and your note.',
    meta: '',
    blocks: [],
  },
};

/** In both app themes: following the app, then the four fixed Reader themes (they never change). */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME), readerThemes: Object.values(READER_THEME) },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="background: var(--bg); padding: 1rem">
            <ui-reader style="block-size: 24rem" [site]="site" [faviconLetter]="faviconLetter"
              [heading]="heading" [meta]="meta" [blocks]="blocks" />
            @for (readerTheme of readerThemes; track readerTheme) {
              <ui-reader style="block-size: 16rem; margin-block-start: 1rem" [theme]="readerTheme"
                [site]="site" [faviconLetter]="faviconLetter" [heading]="heading" [meta]="meta" [blocks]="blocks" />
            }
          </div>
        }
      </div>`,
  }),
};
