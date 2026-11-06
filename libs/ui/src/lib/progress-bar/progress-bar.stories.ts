import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import type { ProgressBarVariant } from './models/progress-bar-variant.type';
import { ProgressBarComponent } from './progress-bar.component';

const VARIANTS: ProgressBarVariant[] = ['fixed', 'inline'];

const meta: Meta<ProgressBarComponent> = {
  title: 'Components/ProgressBar',
  component: ProgressBarComponent,
  tags: ['autodocs'],
  args: { active: true, variant: 'fixed' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    active: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="ls-box" [class.ls-box--inline]="variant === 'inline'">
        <ui-progress-bar [active]="active" [variant]="variant" [label]="label" [class.ls-inline-bar]="variant === 'inline'" />
        <div class="ls-lines">
          <div class="ls-line ls-line--long"></div>
          <div class="ls-line ls-line--short"></div>
        </div>
      </div>`,
  }),
};

export default meta;
type Story = StoryObj<ProgressBarComponent>;

/** The 2px sage bar at the top of the viewport (here: of the box). It shows after 300 ms. */
export const Fixed: Story = {};

/** Inside a box, for example the boot screen: shown at once, 3px on a track. */
export const Inline: Story = { args: { variant: 'inline', label: 'Loading Shelfmark' } };

/** Toggle `active` in the controls: on finish the bar fills to 100% and fades. */
export const Idle: Story = { args: { active: false } };

/** A request of two seconds: the bar appears after 300 ms, then fills and fades. */
export const FinishesAfterRequest: Story = {
  render: (args) => {
    const active = signal(true);
    setTimeout(() => active.set(false), 2000);
    return {
      props: { args, active },
      template: `
        <div class="ls-box">
          <ui-progress-bar [active]="active()" [variant]="args.variant" />
          <div class="ls-lines">
            <div class="ls-line ls-line--long"></div>
            <div class="ls-line ls-line--short"></div>
          </div>
        </div>`,
    };
  },
};

/** Both variants in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div class="ls-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="ls-panel">
            <p class="ls-caption">fixed (top bar)</p>
            <div class="ls-box">
              <ui-progress-bar [active]="true" />
              <div class="ls-lines">
                <div class="ls-line ls-line--long"></div>
                <div class="ls-line ls-line--short"></div>
              </div>
            </div>
            <p class="ls-caption">inline</p>
            <div class="ls-box ls-box--inline">
              <ui-progress-bar [active]="true" variant="inline" label="Loading Shelfmark" class="ls-inline-bar" />
            </div>
          </div>
        }
      </div>`,
  }),
};
