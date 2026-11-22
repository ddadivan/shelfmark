import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../../components/button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { AutoHeightDirective } from './auto-height.directive';

@Component({
  selector: 'ui-auto-height-demo',
  imports: [AutoHeightDirective, ButtonComponent],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.${THEME_ATTRIBUTE}]="theme" class="rs-panel">
        <div uiAutoHeight>
          <div>
            <p>A preview card.</p>
            @if (more()) {
              <p>More content arrived, so the container grows smoothly and shrinks back.</p>
              <p>Under reduced motion the height just jumps.</p>
            }
          </div>
        </div>
        <div class="rs-actions">
          <ui-button (click)="more.set(!more())">Toggle content</ui-button>
        </div>
      </div>
    }
  `,
})
class AutoHeightDemoComponent {
  protected readonly themes = Object.values(THEME);
  protected readonly more = signal(false);
}

const meta: Meta<AutoHeightDemoComponent> = {
  title: 'Components/Auto height',
  component: AutoHeightDemoComponent,
  tags: ['autodocs'],
};

export default meta;

/** Toggle the content: the container animates its height (200 ms ease-in-out). */
export const Demo: StoryObj<AutoHeightDemoComponent> = {};
