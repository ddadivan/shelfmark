import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { READER_FONT } from './models/reader-font.const';
import { READER_LINE_WIDTH } from './models/reader-line-width.const';
import { READER_TEXT_SIZE } from './models/reader-text-size.const';
import { READER_TONE } from './models/reader-tone.const';
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
          'scrolls and emits `progressed`. Reading settings: `size`, `font`, `width`, `tone` (sepia page).',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(READER_TEXT_SIZE) },
    font: { control: 'inline-radio', options: Object.values(READER_FONT) },
    width: { control: 'inline-radio', options: Object.values(READER_LINE_WIDTH) },
    tone: { control: 'inline-radio', options: Object.values(READER_TONE) },
  },
  args: {
    site: 'angular.dev',
    faviconLetter: 'a',
    heading: 'Zoneless change detection',
    meta: 'Angular team · 2 Oct 2026 · 5 min read',
    notice: '',
    blocks: BLOCKS,
    size: READER_TEXT_SIZE.M,
    font: READER_FONT.Sans,
    width: READER_LINE_WIDTH.Narrow,
    tone: READER_TONE.App,
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-reader style="block-size: 32rem" [site]="site" [faviconLetter]="faviconLetter" [heading]="heading"
        [meta]="meta" [notice]="notice" [blocks]="blocks" [size]="size" [font]="font" [width]="width"
        [tone]="tone" />`,
  }),
};

export default meta;
type Story = StoryObj<ReaderComponent>;

export const Default: Story = {};

/** The sepia page with the serif font and the large text. */
export const SepiaSerif: Story = {
  args: { tone: READER_TONE.Sepia, font: READER_FONT.Serif, size: READER_TEXT_SIZE.L },
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

/** Both themes side by side, like the app and sepia. */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME) },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="background: var(--bg); padding: 1rem">
            <ui-reader style="block-size: 24rem" [site]="site" [faviconLetter]="faviconLetter"
              [heading]="heading" [meta]="meta" [blocks]="blocks" />
            <ui-reader style="block-size: 24rem; margin-block-start: 1rem" tone="sepia" font="serif"
              [site]="site" [faviconLetter]="faviconLetter" [heading]="heading" [meta]="meta" [blocks]="blocks" />
          </div>
        }
      </div>`,
  }),
};
