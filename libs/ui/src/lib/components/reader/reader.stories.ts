import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { READER_FONT } from './models/reader-font.const';
import { READER_LINE_WIDTH } from './models/reader-line-width.const';
import { READER_LINE_SPACING } from './models/reader-line-spacing.const';
import { READER_TEXT_SIZE } from './models/reader-text-size.const';
import { READER_THEME } from './models/reader-theme.const';
import { READER_VIEW_BLOCK } from './models/reader-block-kind.const';
import type { ReaderViewBlock } from './models/reader-view-block.interface';
import type { ReaderViewSpan } from './models/reader-view-span.interface';
import { ReaderComponent } from './reader.component';

const span = (text: string, extra: Partial<ReaderViewSpan> = {}): ReaderViewSpan => ({
  text,
  href: null,
  code: false,
  emphasis: false,
  strong: false,
  ...extra,
});

const BLOCKS: ReaderViewBlock[] = [
  {
    kind: READER_VIEW_BLOCK.Paragraph,
    text: 'Zoneless change detection lets an Angular app update the screen without zone.js. Changes come from signals and explicit events instead of patching every browser API.',
  },
  { kind: READER_VIEW_BLOCK.Heading, text: 'What you gain', level: 2 },
  {
    kind: READER_VIEW_BLOCK.Paragraph,
    text: 'Smaller bundles, cleaner stack traces and fewer surprise renders.',
  },
  {
    kind: READER_VIEW_BLOCK.List,
    text: '',
    items: [
      { spans: [span('Move component state to signals.')], items: [] },
      { spans: [span('Check third-party libraries that expect zone.js.')], items: [] },
    ],
  },
  {
    kind: READER_VIEW_BLOCK.Quote,
    text: 'Start with a leaf feature, measure, then move inward.',
  },
  { kind: READER_VIEW_BLOCK.Code, text: 'provideZonelessChangeDetection()' },
];

/** Every block kind and inline span a real page gives: the Reader of a docs article. */
const RICH_BLOCKS: ReaderViewBlock[] = [
  {
    kind: READER_VIEW_BLOCK.Paragraph,
    text: '',
    spans: [
      span('A '),
      span('Resource', { href: 'https://angular.dev/api/core/Resource', code: true }),
      span(' gives you a way to bring async data into signal code, '),
      span('without', { emphasis: true }),
      span(' leaving the '),
      span('reactive graph', { strong: true }),
      span('. See the '),
      span('guide', { href: 'https://angular.dev/guide/signals' }),
      span('.'),
    ],
  },
  { kind: READER_VIEW_BLOCK.Heading, text: 'Resource loaders', level: 2 },
  {
    kind: READER_VIEW_BLOCK.Note,
    text: 'resourceFromSnapshots is experimental. It is ready for you to try, but it might change.',
    label: 'Important',
  },
  { kind: READER_VIEW_BLOCK.Heading, text: 'Streaming resources', level: 3 },
  {
    kind: READER_VIEW_BLOCK.Code,
    language: 'typescript',
    text: 'const userResource = resource({\n  params: () => ({ id: userId() }),\n  loader: ({ params }) => fetchUser(params),\n});',
  },
  {
    kind: READER_VIEW_BLOCK.List,
    text: '',
    ordered: true,
    items: [
      {
        spans: [span('Create the resource')],
        items: [
          { spans: [span('Pass '), span('params', { code: true })], items: [] },
          { spans: [span('Pass a loader')], items: [] },
        ],
      },
      { spans: [span('Read '), span('value()', { code: true })], items: [] },
    ],
  },
  { kind: READER_VIEW_BLOCK.Heading, text: 'Properties', level: 4 },
  {
    kind: READER_VIEW_BLOCK.Table,
    text: '',
    header: true,
    rows: [
      ['Property', 'Description'],
      ['params', "The value of the resource's params computation."],
      ['previous', 'An object with the previous status.'],
    ],
  },
  {
    kind: READER_VIEW_BLOCK.Image,
    text: 'Figure 1: the status of a resource over time',
    alt: 'A diagram of resource statuses',
    imageUrl: 'https://angular.dev/assets/images/resource.png',
  },
  { kind: READER_VIEW_BLOCK.Quote, text: 'Async data is just state that has not arrived yet.' },
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
    openOriginalLabel: 'Open original',
    newTabLabel: '(opens in a new tab)',
    tableLabel: 'Table',
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
        [openOriginalLabel]="openOriginalLabel" [newTabLabel]="newTabLabel" [tableLabel]="tableLabel"
        [lineSpacing]="lineSpacing" [width]="width" [theme]="theme" />`,
  }),
};

export default meta;
type Story = StoryObj<ReaderComponent>;

export const Default: Story = {};

/** A docs article: inline code, links, emphasis, a callout, nested lists, code with its language, a table and a figure placeholder. */
export const RichArticle: Story = {
  args: { heading: 'Async reactivity with resources', blocks: RICH_BLOCKS },
  render: (args) => ({
    props: args,
    template: `
      <ui-reader style="block-size: 40rem" [site]="site" [faviconLetter]="faviconLetter" [heading]="heading"
        [meta]="meta" [blocks]="blocks" [openOriginalLabel]="openOriginalLabel"
        [newTabLabel]="newTabLabel" [tableLabel]="tableLabel" />`,
  }),
};

/** The same article in Sepia and Black. */
export const RichSepiaAndBlack: Story = {
  args: { heading: 'Async reactivity with resources', blocks: RICH_BLOCKS },
  render: (args) => ({
    props: { ...args, themes: [READER_THEME.Sepia, READER_THEME.Black] },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem">
        @for (theme of themes; track theme) {
          <ui-reader style="block-size: 36rem" [theme]="theme" [site]="site" [faviconLetter]="faviconLetter"
            [heading]="heading + ' (' + theme + ')'" [meta]="meta" [blocks]="blocks"
            [openOriginalLabel]="openOriginalLabel" [newTabLabel]="newTabLabel" [tableLabel]="tableLabel + ' (' + theme + ')'" />
        }
      </div>`,
  }),
};

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

/**
 * In both app themes: following the app, then the four fixed Reader themes (they never change).
 * Each reader is a region named by its title, so every title says which variant it is.
 */
export const AllVariants: Story = {
  render: (args) => ({
    props: { ...args, themes: Object.values(THEME), readerThemes: Object.values(READER_THEME) },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="background: var(--bg); padding: 1rem">
            <ui-reader style="block-size: 24rem" [site]="site" [faviconLetter]="faviconLetter"
              [heading]="heading + ' (' + theme + ')'" [meta]="meta" [blocks]="blocks" />
            @for (readerTheme of readerThemes; track readerTheme) {
              <ui-reader style="block-size: 16rem; margin-block-start: 1rem" [theme]="readerTheme"
                [site]="site" [faviconLetter]="faviconLetter" [heading]="heading + ' (' + theme + ', ' + readerTheme + ')'"
                [meta]="meta" [blocks]="blocks" />
            }
          </div>
        }
      </div>`,
  }),
};
