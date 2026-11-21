import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { PreviewFrameComponent } from './preview-frame.component';

// Storybook runs under `frame-src 'self'` (the production CSP of libs/ui/vercel.json, checked by
// `test-storybook`), so a story cannot show a real third-party page: every story uses an URL the
// component refuses, which leaves the frame blank on its canvas. Live pages are checked in the app.
const REFUSED = 'http://example.com/';

const meta: Meta<PreviewFrameComponent> = {
  title: 'Components/PreviewFrame',
  component: PreviewFrameComponent,
  tags: ['autodocs'],
  args: { src: REFUSED, title: 'Preview of Example Domain', timeoutMs: 10000 },
  argTypes: {
    src: { control: 'text' },
    title: { control: 'text' },
    timeoutMs: { control: 'number' },
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: { args },
    template: `
      <div class="rs-frame">
        <ui-preview-frame [src]="args.src" [title]="args.title" [timeoutMs]="args.timeoutMs" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<PreviewFrameComponent>;

/**
 * A refused URL (`http:`): the iframe never receives it, stays blank on the white canvas and
 * `rejected` emits. An accepted `https:` page would show here with the progress bar on top
 * until it loads (not shown in Storybook: its CSP allows no outside frames).
 */
export const Rejected: Story = {};

/** The canvas is white in both themes: a page keeps its own look in the dark theme. */
export const AllThemes: Story = {
  render: (args) => ({
    props: { args, themes: Object.values(THEME) },
    template: `
      <div class="rs-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="rs-panel">
            <p class="rs-caption">{{ theme }}</p>
            <div class="rs-frame">
              <ui-preview-frame [src]="args.src" [title]="args.title" [timeoutMs]="args.timeoutMs" />
            </div>
          </div>
        }
      </div>`,
  }),
};
