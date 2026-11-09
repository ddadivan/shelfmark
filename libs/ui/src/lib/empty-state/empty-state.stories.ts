import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { ILLUSTRATION_MOTION } from '../illustration/models/illustration-motion.const';
import { ILLUSTRATION_NAMES } from '../illustration/models/illustration-names.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Components/EmptyState',
  component: EmptyStateComponent,
  tags: ['autodocs'],
  args: {
    heading: 'Your links will appear here',
    text: 'Paste a link to a video, an article or something to buy. The title and preview fill in by themselves.',
    illustration: 'empty-feed',
    headingLevel: 2,
  },
  argTypes: {
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
    illustration: { control: 'select', options: [undefined, ...ILLUSTRATION_NAMES] },
    illustrationMotion: {
      control: 'inline-radio',
      options: [undefined, ...Object.values(ILLUSTRATION_MOTION)],
    },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
  },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [ButtonComponent] },
    template: `
      <ui-empty-state
        [heading]="heading"
        [text]="text"
        [icon]="icon"
        [illustration]="illustration"
        [illustrationMotion]="illustrationMotion"
        [headingLevel]="headingLevel"
      >
        <ui-button variant="primary" iconLeft="add">Add link</ui-button>
      </ui-empty-state>`,
  }),
};

export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const NoLinks: Story = {};

export const EmptyFolder: Story = {
  args: {
    heading: 'This folder is empty',
    text: 'Add a link here, or move links from Unsorted.',
    illustration: 'empty-folder',
  },
};

export const NothingFound: Story = {
  args: {
    heading: 'Nothing found',
    text: 'Try another word, or search in all folders.',
    illustration: 'not-found',
  },
};

/** Two actions: equal width (160px minimum), 12px apart, wrapping with the same gap on a phone. */
export const TwoActions: Story = {
  args: {
    heading: 'This folder is empty',
    text: 'Add a link here, or move links from Unsorted.',
    illustration: 'empty-folder',
  },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [ButtonComponent] },
    template: `
      <ui-empty-state [heading]="heading" [text]="text" [illustration]="illustration">
        <ui-button>Open Unsorted</ui-button>
        <ui-button variant="primary" iconLeft="add">Add link</ui-button>
      </ui-empty-state>`,
  }),
};

/** With an icon tile instead of a scene. */
export const WithIcon: Story = {
  args: { illustration: undefined, icon: 'bookmark' },
};

/** Without an action the text stands alone. */
export const WithoutAction: Story = {
  render: (args) => ({
    props: args,
    template: `<ui-empty-state [heading]="heading" [text]="text" [illustration]="illustration" />`,
  }),
};

/** The three stage 1 variants in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [ButtonComponent] },
    props: {
      cases: [
        {
          heading: 'Your links will appear here',
          text: 'Paste a link to a video, an article or something to buy.',
          scene: 'empty-feed',
          action: 'Add link',
        },
        {
          heading: 'This folder is empty',
          text: 'Add a link here, or move links from Unsorted.',
          scene: 'empty-folder',
          action: 'Add link',
        },
        {
          heading: 'Nothing found',
          text: 'Try another word, or search in all folders.',
          scene: 'not-found',
          action: 'Clear search',
        },
      ],
      themes: Object.values(THEME),
    },
    template: `
      <div class="story-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="story-theme-pane story-theme-pane--empty">
            @for (c of cases; track c.heading) {
              <ui-empty-state [heading]="c.heading" [text]="c.text" [illustration]="c.scene" illustrationMotion="none">
                <ui-button variant="primary">{{ c.action }}</ui-button>
              </ui-empty-state>
            }
          </div>
        }
      </div>`,
  }),
};
