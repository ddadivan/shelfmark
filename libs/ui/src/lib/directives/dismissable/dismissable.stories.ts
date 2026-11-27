import { Component, ElementRef, signal, viewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../../components/button/button.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { Dismissable } from './dismissable';
import type { DismissReason } from './models/dismiss-reason.type';

@Component({
  selector: 'ui-dismissable-demo',
  imports: [ButtonComponent],
  template: `
    <div class="dm-pane">
      <ui-button #trigger (click)="toggle()">{{ open() ? 'Close panel' : 'Open panel' }}</ui-button>
      @if (open()) {
        <div #panel class="dm-panel" role="group" aria-label="Demo panel">
          Press outside or hit Esc to dismiss me.
        </div>
      }
      <p class="dm-readout">Last dismiss reason: {{ reason() ?? 'none yet' }}</p>
    </div>
  `,
})
class DismissableDemoComponent {
  protected readonly open = signal(false);
  protected readonly reason = signal<DismissReason | null>(null);
  private readonly trigger = viewChild.required('trigger', { read: ElementRef });
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly dismissable = new Dismissable({
    inside: () => [this.trigger().nativeElement, this.panel()?.nativeElement],
    dismissed: ({ reason }) => {
      this.reason.set(reason);
      this.close();
    },
  });

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.open.set(true);
      this.dismissable.arm();
    }
  }

  private close(): void {
    this.open.set(false);
    this.dismissable.disarm();
  }
}

@Component({
  selector: 'ui-dismissable-themes',
  imports: [DismissableDemoComponent],
  template: `
    <div class="ds-themes">
      @for (theme of themes; track theme) {
        <div [attr.${THEME_ATTRIBUTE}]="theme">
          <ui-dismissable-demo />
        </div>
      }
    </div>
  `,
})
class DismissableThemesComponent {
  protected readonly themes = Object.values(THEME);
}

const meta: Meta<DismissableThemesComponent> = {
  title: 'Directives/Dismissable',
  component: DismissableThemesComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`Dismissable` is a class (not a template directive) created in an injection context. ' +
          '`arm()` listens for a press outside the layer and its anchor and for Esc; `disarm()` ' +
          'stops. The callback gets the reason (`pointer` or `escape`).',
      },
    },
  },
};

export default meta;

/** Open the panel, then press outside it or hit Esc; the readout shows why it closed. */
export const Demo: StoryObj<DismissableThemesComponent> = {};
