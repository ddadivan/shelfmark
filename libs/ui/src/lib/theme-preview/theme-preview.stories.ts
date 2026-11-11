import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LAYOUT_ATTRIBUTE, LAYOUT_OFF, THEME, THEME_ATTRIBUTE, THEME_CUSTOM } from '../theme';
import type { ThemePreviewCard } from './models/theme-preview-card.interface';
import { ThemePreviewComponent } from './theme-preview.component';

const FOLDERS = ['Angular', 'Clothes', 'Recipes'];
const CARDS: ThemePreviewCard[] = [
  {
    site: 'youtube.com',
    title: 'Signal Forms in 20 minutes',
    note: 'Watch on the weekend',
    tag: 'angular',
  },
  { site: 'cos.com', title: 'Wool coat, straight cut', note: 'Wait for the sale', tag: 'clothes' },
  { site: 'dev.to', title: 'NgRx SignalStore patterns', tag: 'angular' },
  { site: 'seriouseats.com', title: 'Weeknight ramen', tag: 'recipes' },
];

const meta: Meta<ThemePreviewComponent> = {
  title: 'Components/ThemePreview',
  component: ThemePreviewComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A static sample of the app in the current tokens (Settings › Appearance, "Live preview"): ' +
          'a sidebar with the active folder and a few cards. Tokens only, so it follows the theme of ' +
          'its ancestors, a Custom theme included. One image to assistive technology.',
      },
    },
  },
  args: { ariaLabel: 'Preview of your settings', folders: FOLDERS, cards: CARDS },
  render: (args) => ({
    props: args,
    template: `
      <div class="fs-wide">
        <ui-theme-preview [ariaLabel]="ariaLabel" [folders]="folders" [cards]="cards" />
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ThemePreviewComponent>;

export const Default: Story = {};

/** Light, dark and two Custom themes (light Ocean on Paper with soft corners, dark Rose on Ink, square). */
export const AllVariants: Story = {
  render: () => ({
    props: {
      panes: [
        { theme: THEME.Light, base: null, accent: null, background: null, corners: null },
        { theme: THEME.Dark, base: null, accent: null, background: null, corners: null },
        {
          theme: THEME_CUSTOM,
          base: THEME.Light,
          accent: 'ocean',
          background: 'paper',
          corners: 'soft',
        },
        {
          theme: THEME_CUSTOM,
          base: THEME.Dark,
          accent: 'rose',
          background: 'ink',
          corners: 'square',
        },
      ],
      folders: FOLDERS,
      cards: CARDS.slice(0, 2),
    },
    template: `
      <div class="ds-themes">
        @for (pane of panes; track $index) {
          <div
            [attr.${THEME_ATTRIBUTE}]="pane.theme"
            [attr.data-custom-base]="pane.base"
            [attr.data-custom-accent]="pane.accent"
            [attr.data-custom-background]="pane.background"
            [attr.data-custom-corners]="pane.corners"
            class="ds-pane"
          >
            <ui-theme-preview ariaLabel="Preview of your settings" [folders]="folders" [cards]="cards" />
          </div>
        }
      </div>`,
  }),
};

/**
 * The layout options of #285 on a wrapper (the app sets them on <html>): the readable font,
 * compact density, small previews and no tags, with link counts and a Recently opened row; both
 * themes.
 */
export const LayoutOptions: Story = {
  // Its own page only: on the autodocs page this story sends Storybook's docs chrome into an
  // endless selectionchange loop (seen in Storybook 10 docs, not in the app or the story page).
  tags: ['!autodocs'],
  render: () => ({
    props: {
      panes: Object.values(THEME).map((theme) => ({
        theme,
        font: 'readable',
        density: 'compact',
        preview: 'small',
        tags: LAYOUT_OFF,
      })),
      folders: ['All links', 'Angular', 'Clothes'],
      counts: [248, 12, 7],
      cards: CARDS.slice(0, 2),
    },
    template: `
      <div class="ds-themes">
        @for (pane of panes; track $index) {
          <div
            [attr.${THEME_ATTRIBUTE}]="pane.theme"
            [attr.${LAYOUT_ATTRIBUTE.Font}]="pane.font"
            [attr.${LAYOUT_ATTRIBUTE.Density}]="pane.density"
            [attr.${LAYOUT_ATTRIBUTE.CardPreview}]="pane.preview"
            [attr.${LAYOUT_ATTRIBUTE.CardTags}]="pane.tags"
            class="ds-pane"
          >
            <ui-theme-preview
              ariaLabel="Preview of your settings"
              [folders]="folders"
              [counts]="counts"
              recentLabel="Recently opened"
              [cards]="cards"
            />
          </div>
        }
      </div>`,
  }),
};
