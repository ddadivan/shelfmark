import { Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { pageVisible } from '../../utils/page-visible';
import { UiInViewDirective } from './in-view.directive';

@Component({
  selector: 'ui-in-view-demo',
  imports: [UiInViewDirective],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.${THEME_ATTRIBUTE}]="theme" class="dm-pane">
        <div
          class="dm-scroll"
          tabindex="0"
          role="region"
          [attr.aria-label]="'Scroll area, ' + theme"
        >
          <p class="dm-filler">Scroll down to the sentinel.</p>
          <div
            class="dm-sentinel"
            uiInView
            uiInViewRoot="scroll-parent"
            #sentinel="uiInView"
            (entered)="entered.set(entered() + 1)"
          >
            Sentinel: {{ sentinel.inView() ? 'in view' : 'out of view' }}
          </div>
          <p class="dm-filler">The end.</p>
        </div>
        <p class="dm-readout">Entered {{ entered() }} time(s).</p>
        <p class="dm-readout">Tab is {{ visible() ? 'visible' : 'hidden' }} (pageVisible()).</p>
      </div>
    }
  `,
})
class InViewDemoComponent {
  protected readonly themes = Object.values(THEME);
  protected readonly entered = signal(0);
  protected readonly visible = pageVisible();
}

const meta: Meta<InViewDemoComponent> = {
  title: 'Directives/InView',
  component: InViewDemoComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '`uiInView` reports whether its host is in view (`inView` signal) and emits `entered` ' +
          'each time it comes into view; `uiInViewRoot="scroll-parent"` measures against the ' +
          'nearest scrolling ancestor. `pageVisible()` is a signal of the tab visibility.',
      },
    },
  },
};

export default meta;

/** Scroll the area: the sentinel turns "in view" and the counter goes up. */
export const Demo: StoryObj<InViewDemoComponent> = {};
