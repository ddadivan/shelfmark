import { Component, inject, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { UiDialogRef } from '../../services/dialog/dialog-ref';
import { DialogService } from '../../services/dialog/dialog.service';
import { DIALOG_SIZE } from '../dialog/models/dialog-size.const';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';
import { SHEET_HEIGHT } from './models/sheet-height.const';
import type { SheetHeight } from './models/sheet-height.type';
import { SheetComponent } from './sheet.component';

/** Content of the live demo: a short or long list in a sheet with a "Clear" action. */
@Component({
  selector: 'ui-sheet-story-content',
  imports: [SheetComponent, ButtonComponent],
  template: `
    <ui-sheet title="Recently opened" closeLabel="Close" [height]="height">
      <ui-button slot="actions" variant="ghost" size="sm" (click)="ref.close('cleared')">
        Clear
      </ui-button>
      @for (title of titles; track title) {
        <p class="sst-line">{{ title }}</p>
      }
    </ui-sheet>
  `,
})
class StoryContentComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
  protected height: SheetHeight = SHEET_HEIGHT.Auto;
  protected titles = [
    'Wool coat, straight cut',
    'Signal Forms in 20 minutes',
    'Neon free plan limits',
  ];

  setup(height: SheetHeight, count: number): void {
    this.height = height;
    this.titles = Array.from({ length: count }, (_value, index) => `Saved link ${index + 1}`);
  }
}

@Component({
  selector: 'ui-sheet-story-demo',
  imports: [ButtonComponent],
  template: `
    <div class="dst-panel">
      <ui-button variant="primary" (click)="open()">Open sheet</ui-button>
      <p class="dst-result" aria-live="polite">{{ result() }}</p>
    </div>
  `,
})
class StoryDemoComponent {
  readonly height = input<SheetHeight>(SHEET_HEIGHT.Auto);
  readonly count = input(3);

  private readonly dialogs = inject(DialogService);
  protected readonly result = signal('Nothing chosen yet.');

  protected async open(): Promise<void> {
    const ref = this.dialogs.open<StoryContentComponent, string>(StoryContentComponent, {
      size: DIALOG_SIZE.Md,
    });
    ref.componentInstance?.setup(this.height(), this.count());
    const value = await ref.result;
    this.result.set(value === 'cleared' ? 'Cleared.' : 'Dismissed.');
  }
}

interface SheetArgs {
  height: SheetHeight;
}

const meta: Meta<SheetArgs> = {
  title: 'Components/Sheet',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`ui-sheet` is the content of a bottom sheet, opened with `DialogService.open()` like a dialog ' +
          '(it renders a `ui-dialog` with sheet styling, so scrim, focus trap, Esc, drag and flick to close ' +
          "and the leave animation are the dialog's). Below 40em it slides up from the bottom with a grip " +
          'and 28px top corners; `tall` fills the screen but always leaves 150px of the page above. On ' +
          'larger screens it is a centred dialog.',
      },
    },
  },
  args: { height: SHEET_HEIGHT.Auto },
  argTypes: { height: { control: 'inline-radio', options: Object.values(SHEET_HEIGHT) } },
};

export default meta;
type Story = StoryObj<SheetArgs>;

const phoneViewport = {
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
  globals: { viewport: { value: 'phone', isRotated: false } },
};

/** Short content: the sheet is as tall as the list. Desktop width shows the centred dialog. */
export const Auto: Story = {
  render: () => ({
    moduleMetadata: { imports: [StoryDemoComponent] },
    template: `<ui-sheet-story-demo height="auto" [count]="3" />`,
  }),
};

/** `tall` with a long list: the body scrolls and 150px of the page stay visible above. */
export const Tall: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [StoryDemoComponent] },
    template: `<ui-sheet-story-demo [height]="height" [count]="30" />`,
  }),
  args: { height: SHEET_HEIGHT.Tall },
};

/** Phone width: drag the grip or flick down to close; Esc and the close button also work. */
export const PhoneTall: Story = {
  ...phoneViewport,
  args: { height: SHEET_HEIGHT.Tall },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports: [StoryDemoComponent] },
    template: `<ui-sheet-story-demo [height]="height" [count]="30" />`,
  }),
};

/** Phone width, short content. */
export const PhoneAuto: Story = {
  ...phoneViewport,
  render: () => ({
    moduleMetadata: { imports: [StoryDemoComponent] },
    template: `<ui-sheet-story-demo height="auto" [count]="3" />`,
  }),
};

const frame = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="dst-gallery">
    <p class="dst-hint">${theme} theme: static panels (open the stories above for the live sheet)</p>
    <div class="dst-scrim">
      <ui-sheet title="Recently opened" closeLabel="Close">
        <ui-button slot="actions" variant="ghost" size="sm">Clear</ui-button>
        <p class="sst-line">Wool coat, straight cut</p>
        <p class="sst-line">Signal Forms in 20 minutes</p>
      </ui-sheet>
    </div>
    <div class="dst-scrim">
      <ui-sheet title="Remind me" height="tall" closeLabel="Close">
        <p class="sst-line">Later today</p>
        <p class="sst-line">Tomorrow morning</p>
      </ui-sheet>
    </div>
  </div>`;

/** Both themes (desktop width shows the dialog form; the phone stories show the sheet). */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [SheetComponent, ButtonComponent] },
    template: Object.values(THEME).map(frame).join(''),
  }),
};
