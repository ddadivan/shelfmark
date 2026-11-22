import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { TextSwapComponent } from './text-swap.component';

const STEPS = ['Searching your links…', 'Reading the best matches…', 'Writing the answer…'];

@Component({
  selector: 'ui-text-swap-demo',
  imports: [TextSwapComponent, ButtonComponent],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.${THEME_ATTRIBUTE}]="theme" class="rs-panel">
        <p><ui-text-swap [text]="step()" shimmer /></p>
        <p><ui-text-swap [text]="step()" /></p>
        <div class="rs-actions">
          <ui-button (click)="next()"><ui-text-swap [text]="step()" /></ui-button>
        </div>
      </div>
    }
  `,
})
class TextSwapDemoComponent {
  protected readonly themes = Object.values(THEME);
  protected readonly index = signal(0);
  protected readonly step = () => STEPS[this.index() % STEPS.length];
  protected next(): void {
    this.index.update((i) => i + 1);
  }
}

const meta: Meta<TextSwapComponent> = {
  title: 'Components/Text swap',
  component: TextSwapComponent,
  tags: ['autodocs'],
};

export default meta;

/** Press the button: the text blurs out and the next one rises out of the blur (a fade under reduced motion). */
export const Demo: StoryObj<TextSwapComponent> = {
  render: () => ({
    moduleMetadata: { imports: [TextSwapDemoComponent] },
    template: '<ui-text-swap-demo />',
  }),
};
