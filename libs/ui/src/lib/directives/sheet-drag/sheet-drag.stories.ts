import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../../components/button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { SheetDragDirective } from './sheet-drag.directive';

@Component({
  selector: 'ui-sheet-drag-demo',
  imports: [SheetDragDirective, ButtonComponent],
  template: `
    <div class="dm-pane">
      @if (shown()) {
        <div #sheet class="dm-sheet" [class.dm-sheet--snapping]="drag.snapping()">
          <div
            class="dm-grip"
            role="group"
            aria-label="Sheet handle"
            [uiSheetDrag]="sheet"
            #drag="uiSheetDrag"
            (closeRequested)="shown.set(false)"
          >
            <span class="dm-grip-bar" aria-hidden="true"></span>
          </div>
          <p class="dm-readout">Drag the handle down: far or fast closes, short snaps back.</p>
          <p class="dm-readout">Dragging: {{ drag.dragging() }}, snapping: {{ drag.snapping() }}</p>
        </div>
      } @else {
        <ui-button (click)="shown.set(true)">Show sheet again</ui-button>
      }
      @if (!shown()) {
        <p class="dm-readout">Closed by drag</p>
      }
    </div>
  `,
})
class SheetDragDemoComponent {
  protected readonly shown = signal(true);
}

@Component({
  selector: 'ui-sheet-drag-themes',
  imports: [SheetDragDemoComponent],
  template: `
    <div class="ds-themes">
      @for (theme of themes; track theme) {
        <div [attr.${THEME_ATTRIBUTE}]="theme"><ui-sheet-drag-demo /></div>
      }
    </div>
  `,
})
class SheetDragThemesComponent {
  protected readonly themes = Object.values(THEME);
}

const meta: Meta<SheetDragThemesComponent> = {
  title: 'Directives/SheetDrag',
  component: SheetDragThemesComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`uiSheetDrag` on a sheet handle moves the panel with the pointer (`--ui-sheet-drag`). ' +
          'A release past 30% of the height or a flick emits `closeRequested`; otherwise the ' +
          'sheet snaps back (`snapping`).',
      },
    },
  },
};

export default meta;

/** Drag the handle with a mouse or finger. */
export const Demo: StoryObj<SheetDragThemesComponent> = {};
