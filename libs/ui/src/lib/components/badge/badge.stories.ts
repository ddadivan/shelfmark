import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { BadgeComponent } from './badge.component';
import { BADGE_TONE } from './models/badge-tone.const';

const meta: Meta<BadgeComponent> = {
  title: 'Components/Badge',
  component: BadgeComponent,
  tags: ['autodocs'],
  args: { tone: BADGE_TONE.Neutral },
  argTypes: {
    tone: { control: 'inline-radio', options: Object.values(BADGE_TONE) },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
  },
  render: (args) => ({
    props: args,
    template: `<ui-badge [tone]="tone" [icon]="icon">30 days left</ui-badge>`,
  }),
};

export default meta;
type Story = StoryObj<BadgeComponent>;

export const Neutral: Story = {};

export const Accent: Story = { args: { tone: BADGE_TONE.Accent } };

export const Warning: Story = { args: { tone: BADGE_TONE.Warning, icon: 'clock' } };

export const Danger: Story = { args: { tone: BADGE_TONE.Danger } };

export const WithIcon: Story = { args: { icon: 'star' } };

/** Every tone, with and without an icon, in both themes. */
export const AllVariants: Story = {
  render: () => ({
    props: {
      tones: Object.values(BADGE_TONE),
      themes: Object.values(THEME),
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-row">
              @for (tone of tones; track tone) {
                <ui-badge [tone]="tone">{{ tone }}</ui-badge>
                <ui-badge [tone]="tone" icon="clock">{{ tone }}</ui-badge>
              }
            </div>
          </div>
        }
      </div>`,
  }),
};
