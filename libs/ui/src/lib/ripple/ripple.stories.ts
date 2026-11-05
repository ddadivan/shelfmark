import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { RippleDirective } from './ripple.directive';

const meta: Meta<RippleDirective> = {
  title: 'Components/Ripple',
  component: RippleDirective,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<RippleDirective>;

const panel = (theme: 'light' | 'dark') => `
  <div data-theme="${theme}" class="rs-panel">
    <div class="rs-actions">
      <ui-button variant="primary">Primary</ui-button>
      <ui-button variant="secondary">Secondary</ui-button>
      <ui-button variant="ghost">Ghost</ui-button>
      <ui-button variant="danger">Danger</ui-button>
    </div>
    <div class="rs-rows">
      <button type="button" uiRipple class="rs-row">All links</button>
      <button type="button" uiRipple class="rs-row">Favorites</button>
      <button type="button" [uiRipple]="false" class="rs-row">Opted out</button>
    </div>
  </div>`;

/**
 * Press (or Enter / Space) to see it. Buttons, plain rows and an opted-out row, light and dark.
 * Under `prefers-reduced-motion` there is no ripple.
 */
export const Demo: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports: [RippleDirective, ButtonComponent] },
    template: `${panel('light')}${panel('dark')}`,
  }),
};

/** A plain row: `uiRipple` works on any host. */
export const OnRow: Story = {
  render: () => ({
    moduleMetadata: { imports: [RippleDirective] },
    template: `<div class="rs-narrow"><button type="button" uiRipple class="rs-row">Unsorted</button></div>`,
  }),
};

/** `ui-button` plays it on the inner button; `[ripple]="false"` opts out. */
export const OnButton: Story = {
  render: () => ({
    moduleMetadata: { imports: [ButtonComponent] },
    template: `
      <div class="rs-actions">
        <ui-button variant="primary">Ripple</ui-button>
        <ui-button [ripple]="false">No ripple</ui-button>
      </div>`,
  }),
};
