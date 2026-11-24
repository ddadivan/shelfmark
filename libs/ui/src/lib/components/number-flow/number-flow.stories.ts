import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { NumberFlowComponent } from './number-flow.component';

const meta: Meta<NumberFlowComponent> = {
  title: 'Components/Number flow',
  component: NumberFlowComponent,
  tags: ['autodocs'],
  args: { value: 128 },
};

export default meta;
type Story = StoryObj<NumberFlowComponent>;

/** Change `value` in the controls: only the digits that changed slide and cross-fade. */
export const Default: Story = {};

/** Both themes: the buttons grow and shrink the number (digits move up or down). */
export const Counting: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), n: 9 },
    template: `
      <div style="display: flex; gap: 2rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: var(--bg); color: var(--text)">
            <button type="button" data-ds-ignore (click)="n = n - 1">-1</button>
            <button type="button" data-ds-ignore (click)="n = n + 1">+1</button>
            <button type="button" data-ds-ignore (click)="n = n * 10">x10</button>
            <ui-number-flow [value]="n" style="font-size: 1.5rem" />
          </div>
        }
      </div>`,
  }),
};
