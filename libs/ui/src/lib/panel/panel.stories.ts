import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { PanelComponent } from './panel.component';

const meta: Meta<PanelComponent> = {
  title: 'Components/Panel',
  component: PanelComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [PanelComponent] })],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Groups related content or settings on `surface` with `shadow-card` (22px corners, 24px padding, 16px gap). ' +
          'Content is projected. Panels never nest: inside a panel, group with a `bg` inset instead.',
      },
    },
  },
  render: () => ({
    template: `
      <ui-panel>
        <h3>Appearance</h3>
        <p>Choose how Shelfmark looks on this device.</p>
      </ui-panel>`,
  }),
};

export default meta;
type Story = StoryObj<PanelComponent>;

export const Default: Story = {};

/** The panel in both themes side by side. */
export const AllVariants: Story = {
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-panel>
              <h3>Appearance</h3>
              <p>Choose how Shelfmark looks on this device.</p>
            </ui-panel>
          </div>
        }
      </div>`,
  }),
};
