import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ProgressBarComponent } from './progress-bar.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { PROGRESS_BAR_VARIANT } from './models/progress-bar-variant.const';

const VARIANTS = Object.values(PROGRESS_BAR_VARIANT);

const meta: Meta<ProgressBarComponent> = {
  title: 'Components/ProgressBar',
  component: ProgressBarComponent,
  tags: ['autodocs'],
  args: { active: true, variant: PROGRESS_BAR_VARIANT.Fixed },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    active: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="ls-box" [class.ls-box--inline]="variant === PROGRESS_BAR_VARIANT.Inline">
        <ui-progress-bar [active]="active" [variant]="variant" [label]="label" [class.ls-inline-bar]="variant === PROGRESS_BAR_VARIANT.Inline" />
        <div class="ls-lines" [attr.aria-busy]="active">
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
export const Inline: Story = {
  args: { variant: PROGRESS_BAR_VARIANT.Inline, label: 'Loading Shelfmark' },
};

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
          <div class="ls-lines" [attr.aria-busy]="active()">
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
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ls-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ls-panel">
            <p class="ls-caption">fixed (top bar)</p>
            <div class="ls-box">
              <ui-progress-bar [active]="true" />
              <div class="ls-lines" aria-busy="true">
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
