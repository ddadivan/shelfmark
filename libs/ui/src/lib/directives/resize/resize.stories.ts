import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { UiResizeDirective } from './resize.directive';

@Component({
  selector: 'ui-resize-demo',
  imports: [UiResizeDirective],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.${THEME_ATTRIBUTE}]="theme" class="dm-pane">
        <div
          class="dm-resizable"
          uiResize
          #box="uiResize"
          tabindex="0"
          role="group"
          aria-label="Resizable box"
        >
          <span>
            {{
              box.size()
                ? round(box.size()!.width) + ' x ' + round(box.size()!.height)
                : 'measuring'
            }}
          </span>
        </div>
        <p class="dm-readout">Drag the bottom-right corner to resize the box.</p>
      </div>
    }
  `,
})
class ResizeDemoComponent {
  protected readonly themes = Object.values(THEME);
  protected round(value: number): number {
    return Math.round(value);
  }
}

const meta: Meta<ResizeDemoComponent> = {
  title: 'Directives/Resize',
  component: ResizeDemoComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`uiResize` keeps the border-box size of its host in a signal (`size`, via ' +
          '`exportAs="uiResize"`) and emits `resized` on each change.',
      },
    },
  },
};

export default meta;

/** The box shows its live width and height in pixels. */
export const Demo: StoryObj<ResizeDemoComponent> = {};
