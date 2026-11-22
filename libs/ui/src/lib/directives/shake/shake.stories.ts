import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { InputComponent } from '../../components/input/input.component';
import { ButtonComponent } from '../../components/button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { ShakeDirective } from './shake.directive';

@Component({
  selector: 'ui-shake-demo',
  imports: [ShakeDirective, InputComponent, ButtonComponent],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.${THEME_ATTRIBUTE}]="theme" class="rs-panel">
        <ui-input label="Link" error="Enter a valid address" value="nope" [uiShake]="count()" />
        <div class="rs-actions">
          <ui-button (click)="count.set(count() + 1)">Submit</ui-button>
        </div>
      </div>
    }
  `,
})
class ShakeDemoComponent {
  protected readonly themes = Object.values(THEME);
  protected readonly count = signal(0);
}

const meta: Meta<ShakeDemoComponent> = {
  title: 'Components/Shake',
  component: ShakeDemoComponent,
  tags: ['autodocs'],
};

export default meta;

/** Press Submit: the field shakes once (320 ms). Reduced motion keeps only the error border. */
export const Demo: StoryObj<ShakeDemoComponent> = {};
