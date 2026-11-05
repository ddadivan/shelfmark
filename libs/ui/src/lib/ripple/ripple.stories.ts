import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { RippleDirective } from './ripple.directive';

const row = `
  display: block; width: 100%; padding: 0.75rem 1rem; text-align: start; cursor: pointer;
  font: inherit; color: var(--text); background: transparent; border: 0; border-radius: var(--radius-md);`;

const meta: Meta<RippleDirective> = {
  title: 'Components/Ripple',
  component: RippleDirective,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<RippleDirective>;

const panel = (theme: 'light' | 'dark') => `
  <div data-theme="${theme}" style="padding: 1.5rem; background: var(--bg); color: var(--text); display: grid; gap: 1rem; max-width: 24rem">
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap">
      <ui-button variant="primary">Primary</ui-button>
      <ui-button variant="secondary">Secondary</ui-button>
      <ui-button variant="ghost">Ghost</ui-button>
      <ui-button variant="danger">Danger</ui-button>
    </div>
    <div style="display: grid; gap: 0.25rem">
      <button type="button" uiRipple style="${row}">All links</button>
      <button type="button" uiRipple style="${row}">Favorites</button>
      <button type="button" [uiRipple]="false" style="${row}">Opted out</button>
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
    template: `<div style="width: 18rem"><button type="button" uiRipple style="${row}">Unsorted</button></div>`,
  }),
};

/** `ui-button` plays it on the inner button; `[ripple]="false"` opts out. */
export const OnButton: Story = {
  render: () => ({
    moduleMetadata: { imports: [ButtonComponent] },
    template: `
      <div style="display: flex; gap: 0.75rem">
        <ui-button variant="primary">Ripple</ui-button>
        <ui-button [ripple]="false">No ripple</ui-button>
      </div>`,
  }),
};
