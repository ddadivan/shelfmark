import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { CheckMarkComponent } from './check-mark.component';

const meta: Meta<CheckMarkComponent> = {
  title: 'Components/Check mark',
  component: CheckMarkComponent,
  tags: ['autodocs'],
  args: { size: 24, draw: true },
};

export default meta;
type Story = StoryObj<CheckMarkComponent>;

/** The stroked tick of the checkbox and the success toast; it draws itself when it is created. */
export const Default: Story = {};

export const Themes: Story = {
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div style="display: flex; gap: 2rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="display: flex; gap: 1rem; padding: 1.5rem; background: var(--bg); color: var(--accent-text)">
            <ui-check-mark [size]="16" draw />
            <ui-check-mark [size]="20" draw />
            <ui-check-mark [size]="24" />
          </div>
        }
      </div>`,
  }),
};
