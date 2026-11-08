import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { ChipComponent } from '../chip/chip.component';
import { LongPressDirective } from './long-press.directive';

const meta: Meta<LongPressDirective> = {
  title: 'Directives/LongPress',
  component: LongPressDirective,
  tags: ['autodocs'],
  decorators: [],
  parameters: {
    docs: {
      description: {
        component:
          'Emits `uiLongPress` after a touch or pen is held for 500 ms (iOS Safari fires no ' +
          '`contextmenu`). Cancelled by movement over 10 px, release or scroll; swallows the ' +
          'click and the native context menu only when it fired. Keyboard and mouse are ' +
          'unaffected. Use a touch device or device emulation to try it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<LongPressDirective>;

/** Hold the chip with a finger or pen; the counter goes up and the click does not. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: { imports: [LongPressDirective, ChipComponent] },
    props: { presses: 0, clicks: 0 },
    template: `
      <ui-chip clickable uiLongPress (uiLongPress)="presses = presses + 1" (clicked)="clicks = clicks + 1">
        Hold me
      </ui-chip>
      <p>Long presses: {{ presses }} / clicks: {{ clicks }}</p>`,
  }),
};

/** Both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: [LongPressDirective, ChipComponent] },
    props: { themes: Object.values(THEME), presses: 0 },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-chip clickable uiLongPress (uiLongPress)="presses = presses + 1">Hold me</ui-chip>
            <ui-chip clickable disabled uiLongPress [uiLongPressDisabled]="true">Disabled</ui-chip>
            <p>Long presses: {{ presses }}</p>
          </div>
        }
      </div>`,
  }),
};
