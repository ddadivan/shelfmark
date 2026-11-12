import { Component, inject, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { UiDialogRef } from '../../services/dialog/dialog-ref';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';
import { DrawerComponent } from './drawer.component';
import { DRAWER_SIDE } from './models/drawer-side.const';
import { DrawerService } from '../../services/drawer/drawer.service';

/** Content of the live story: a short menu with a footer, closed through the injected ref. */
@Component({
  selector: 'ui-drawer-story-menu',
  imports: [ButtonComponent, DrawerComponent],
  template: `
    <ui-drawer closeLabel="Close menu">
      <span slot="head" class="drs-title">Shelfmark</span>
      <nav class="drs-nav" aria-label="Library">
        <ui-button variant="ghost" (click)="ref.close('all')">All links</ui-button>
        <ui-button variant="ghost" (click)="ref.close('favorites')">Favorites</ui-button>
        <p class="drs-section">Folders</p>
        <ui-button variant="ghost" (click)="ref.close('work')">Work</ui-button>
        <ui-button variant="ghost" (click)="ref.close('recipes')">Recipes</ui-button>
      </nav>
      <ui-button slot="foot" variant="ghost" (click)="ref.close('settings')">Settings</ui-button>
    </ui-drawer>
  `,
})
class StoryMenuComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
}

/** Content of the end-side story: a panel that slides in from the inline-end edge. */
@Component({
  selector: 'ui-drawer-story-end',
  imports: [DrawerComponent],
  template: `
    <ui-drawer closeLabel="Close panel" [side]="DRAWER_SIDE.End">
      <span slot="head" class="drs-title">Recently opened</span>
      <p class="drs-paragraph">Angular docs</p>
      <p class="drs-paragraph">Recipe: focaccia</p>
    </ui-drawer>
  `,
})
class StoryEndComponent {
  protected readonly DRAWER_SIDE = DRAWER_SIDE;
}

@Component({
  selector: 'ui-drawer-story-end-demo',
  imports: [ButtonComponent],
  template: `
    <div class="drs-panel">
      <ui-button variant="primary" (click)="open()">Open side panel</ui-button>
    </div>
  `,
})
class StoryEndDemoComponent {
  private readonly drawers = inject(DrawerService);

  protected open(): void {
    this.drawers.open(StoryEndComponent, { ariaLabel: 'Recently opened', side: DRAWER_SIDE.End });
  }
}

/** Content that overflows: the body scrolls, header and footer stay. */
@Component({
  selector: 'ui-drawer-story-long',
  imports: [ButtonComponent, DrawerComponent],
  template: `
    <ui-drawer closeLabel="Close menu">
      <span slot="head" class="drs-title">Shelfmark</span>
      @for (row of rows; track row) {
        <p class="drs-paragraph">{{ row }}</p>
      }
      <ui-button slot="foot" variant="ghost" (click)="ref.close()">Settings</ui-button>
    </ui-drawer>
  `,
})
class StoryLongComponent {
  protected readonly ref = inject<UiDialogRef>(UiDialogRef);
  protected readonly rows = Array.from({ length: 40 }, (_value, index) => `Folder ${index + 1}`);
}

type DemoKind = 'menu' | 'long';

@Component({
  selector: 'ui-drawer-story-demo',
  imports: [ButtonComponent],
  template: `
    <div class="drs-panel">
      <ui-button variant="primary" (click)="open()">Open menu</ui-button>
      <p class="drs-paragraph" aria-live="polite">{{ result() }}</p>
    </div>
  `,
})
class StoryDemoComponent {
  private readonly drawers = inject(DrawerService);
  protected readonly result = signal('Nothing chosen yet.');

  protected async open(): Promise<void> {
    const ref = this.drawers.open<StoryMenuComponent, string>(StoryMenuComponent, {
      ariaLabel: 'Library menu',
    });
    this.result.set(`Closed with: ${(await ref.result) ?? 'nothing'}`);
  }
}

@Component({
  selector: 'ui-drawer-story-long-demo',
  imports: [ButtonComponent],
  template: `
    <div class="drs-panel">
      <ui-button variant="primary" (click)="open()">Open long menu</ui-button>
    </div>
  `,
})
class StoryLongDemoComponent {
  private readonly drawers = inject(DrawerService);

  protected open(): void {
    this.drawers.open(StoryLongComponent, { ariaLabel: 'Library menu' });
  }
}

const meta: Meta = {
  title: 'Components/Drawer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`ui-drawer` is the layout of the phone menu (header slot, close button, scrolling body, footer slot) and ' +
          '`DrawerService` opens it on the CDK Dialog from the inline-start edge: focus moves in and is trapped, ' +
          'Esc and the scrim close it, page scroll is locked and focus returns to the trigger. It slides in over ' +
          '320 ms and out over 200 ms; under `prefers-reduced-motion` it only fades.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Opens the drawer; choose an entry, press Esc, use the close button or click the scrim. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryDemoComponent] },
    template: `<ui-drawer-story-demo />`,
  }),
};

/** Pinned to the inline-end edge: it slides in from the right (from the left in rtl). */
export const EndSide: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryEndDemoComponent] },
    template: `<ui-drawer-story-end-demo />`,
  }),
};

/** The body scrolls; the header and footer stay put. */
export const LongContent: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryLongDemoComponent] },
    template: `<ui-drawer-story-long-demo />`,
  }),
};

// Both frames render on one page, so each nav needs its own name (axe landmark-unique).
const frame = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="drs-gallery">
    <p class="drs-hint">${theme} theme: static panel (open the stories above for the live drawer)</p>
    <div class="drs-scrim">
      <ui-drawer closeLabel="Close menu">
        <span slot="head" class="drs-title">Shelfmark</span>
        <nav class="drs-nav" aria-label="Library, ${theme} theme">
          <ui-button variant="ghost">All links</ui-button>
          <ui-button variant="ghost">Favorites</ui-button>
          <p class="drs-section">Folders</p>
          <ui-button variant="ghost">Work</ui-button>
          <ui-button variant="ghost">Recipes</ui-button>
        </nav>
        <ui-button slot="foot" variant="ghost">Settings</ui-button>
      </ui-drawer>
    </div>
  </div>`;

/** Both themes, static. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [DrawerComponent, ButtonComponent] },
    template: `${Object.values(THEME).map(frame).join('')}`,
  }),
};
