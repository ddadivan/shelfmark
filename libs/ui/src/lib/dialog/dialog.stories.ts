import { Component, inject, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { ChipComponent } from '../chip/chip.component';
import { SelectComponent } from '../select/select.component';
import { DialogComponent } from './dialog.component';
import { UiDialogRef } from './dialog-ref';
import { DialogService } from './dialog.service';
import type { ConfirmDialogConfig } from './models/confirm-config.interface';
import { MenuItemComponent } from '../menu/menu-item.component';
import { MenuTriggerDirective } from '../menu/menu-trigger.directive';
import { MenuComponent } from '../menu/menu.component';
import type { DialogSize } from './models/dialog-size.type';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';
import { DIALOG_SIZE } from './models/dialog-size.const';

/** Content of the form story: a short form with Cancel left of the main action. */
@Component({
  selector: 'ui-dialog-story-form',
  imports: [ButtonComponent, DialogComponent],
  template: `
    <form (submit)="$event.preventDefault(); ref.close('saved')">
      <ui-dialog title="Edit link" closeLabel="Close">
        <div class="dst-fields">
          <label class="dst-field">
            <span class="dst-label">Link</span>
            <input class="dst-input" value="https://www.cos.com/en/wool-coat" />
          </label>
          <label class="dst-field">
            <span class="dst-label">Note</span>
            <input class="dst-input" placeholder="Why are you saving this?" />
          </label>
        </div>
        <ui-button slot="footer" (click)="ref.close()">Cancel</ui-button>
        <ui-button slot="footer" variant="primary" type="submit">Save link</ui-button>
      </ui-dialog>
    </form>
  `,
})
class StoryFormComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
}

/** Content of the long-content story: the body scrolls, header and footer stay. */
@Component({
  selector: 'ui-dialog-story-long',
  imports: [ButtonComponent, DialogComponent],
  template: `
    <ui-dialog title="Privacy and data" closeLabel="Close">
      @for (paragraph of paragraphs; track $index) {
        <p class="dst-paragraph">{{ paragraph }}</p>
      }
      <ui-button slot="footer" variant="primary" (click)="ref.close()">Got it</ui-button>
    </ui-dialog>
  `,
})
class StoryLongComponent {
  protected readonly ref = inject<UiDialogRef>(UiDialogRef);
  protected readonly paragraphs = Array.from(
    { length: 14 },
    (_value, index) =>
      `Paragraph ${index + 1}. Shelfmark keeps your saved links in one place. Only you can see them, ` +
      'and you can export or delete everything at any time from the settings.',
  );
}

/** A menu opened from inside a dialog must appear above it (layers: menu above dialog). */
@Component({
  selector: 'ui-dialog-story-menu',
  imports: [
    ButtonComponent,
    DialogComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
  ],
  template: `
    <ui-dialog title="Link actions" closeLabel="Close">
      <ui-button [uiMenuTrigger]="menu" iconRight="chevron-down">Actions</ui-button>
      <ui-menu #menu ariaLabel="Link actions">
        <ui-menu-item icon="edit">Edit</ui-menu-item>
        <ui-menu-item icon="copy">Copy link</ui-menu-item>
        <ui-menu-item icon="trash" danger>Delete</ui-menu-item>
      </ui-menu>
      <ui-button slot="footer" variant="primary" (click)="ref.close()">Done</ui-button>
    </ui-dialog>
  `,
})
class StoryMenuComponent {
  protected readonly ref = inject<UiDialogRef>(UiDialogRef);
}

type DemoKind = 'form' | 'confirm' | 'destructive' | 'long' | 'menu';

const confirmText: ConfirmDialogConfig = {
  title: 'Move link to Unsorted?',
  message: 'The link leaves its folder and goes back to Unsorted.',
  confirmLabel: 'Move link',
  cancelLabel: 'Cancel',
  closeLabel: 'Close',
};

const destructiveText: ConfirmDialogConfig = {
  title: 'Delete folder “Work”?',
  message: 'It has 34 links and 2 subfolders. What should happen to the links?',
  confirmLabel: 'Delete folder',
  cancelLabel: 'Cancel',
  closeLabel: 'Close',
  destructive: true,
};

/** A button that opens the dialog and prints what came back. */
@Component({
  selector: 'ui-dialog-story-demo',
  imports: [ButtonComponent],
  template: `
    <div class="dst-panel">
      <ui-button variant="primary" (click)="open()">Open dialog</ui-button>
      <p class="dst-result" aria-live="polite">{{ result() }}</p>
    </div>
  `,
})
class StoryDemoComponent {
  readonly kind = input<DemoKind>('form');
  readonly size = input<DialogSize>(DIALOG_SIZE.Sm);
  readonly dismissible = input(true);

  private readonly dialogs = inject(DialogService);
  protected readonly result = signal('Nothing chosen yet.');

  protected async open(): Promise<void> {
    switch (this.kind()) {
      case 'confirm':
        this.result.set(`Confirmed: ${await this.dialogs.confirm(confirmText)}`);
        return;
      case 'destructive':
        this.result.set(`Confirmed: ${await this.dialogs.confirm(destructiveText)}`);
        return;
      case 'menu': {
        await this.dialogs.open(StoryMenuComponent, { autoFocus: 'dialog' }).result;
        this.result.set('Closed.');
        return;
      }
      case 'long': {
        await this.dialogs.open(StoryLongComponent, { size: this.size() }).result;
        this.result.set('Closed.');
        return;
      }
      case 'form': {
        const saved = await this.dialogs.open<StoryFormComponent, string>(StoryFormComponent, {
          size: this.size(),
          dismissible: this.dismissible(),
          autoFocus: 'input',
        }).result;
        this.result.set(saved ? 'Saved.' : 'Dismissed.');
        return;
      }
    }
  }
}

interface DialogArgs {
  size: DialogSize;
  dismissible: boolean;
}

const meta: Meta<DialogArgs> = {
  title: 'Components/Dialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`ui-dialog` is the layout of a dialog (title, close button, body, footer) and `DialogService` ' +
          'opens it on the CDK Dialog: focus moves in and is trapped, Esc closes, a scrim click closes ' +
          'unless the dialog is destructive, page scroll is locked and focus returns to the trigger. ' +
          'Below 40em it becomes a bottom sheet you can drag shut. The popup lives in the page body ' +
          'and follows the theme of the page.',
      },
    },
  },
  args: { size: DIALOG_SIZE.Sm, dismissible: true },
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(DIALOG_SIZE) },
    dismissible: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<DialogArgs>;

const imports = [StoryDemoComponent];

/** A short form in a `md` dialog. Esc, the close button and Cancel close it. */
export const FormDialog: Story = {
  args: { size: DIALOG_SIZE.Md },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="form" [size]="size" [dismissible]="dismissible" />`,
  }),
};

/** `sm` is 440px, `md` is 560px. */
export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `
      <div class="dst-row">
        <ui-dialog-story-demo kind="form" size="sm" />
        <ui-dialog-story-demo kind="form" size="md" />
      </div>`,
  }),
};

/** Yes / no question; confirm has focus, so Enter confirms. Esc, Cancel and the scrim answer no. */
export const Confirm: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="confirm" />`,
  }),
};

/** Irreversible action: `alertdialog`, red button, Cancel has focus, the scrim does not close it. */
export const DestructiveConfirm: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="destructive" />`,
  }),
};

/** A menu opened inside a dialog stays above it and closes first on Esc. */
export const MenuInDialog: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="menu" />`,
  }),
};

/** Long content scrolls inside the dialog; header and footer stay put. */
export const LongContent: Story = {
  args: { size: DIALOG_SIZE.Md },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="long" [size]="size" />`,
  }),
};

/**
 * On a phone viewport (below 40em) the dialog is a bottom sheet with a grip: drag the header
 * down (past 30% or with a quick flick) to close it, or use Esc / the close button.
 */
export const PhoneSheet: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { size: DIALOG_SIZE.Md },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `<ui-dialog-story-demo kind="form" [size]="size" />`,
  }),
};

const frame = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="dst-gallery">
    <p class="dst-hint">${theme} theme: static panels (open the stories above for the live dialog)</p>
    <div class="dst-scrim">
      <ui-dialog title="Delete folder “Work”?" closeLabel="Close">
        <p class="dst-text">It has 34 links and 2 subfolders. What should happen to the links?</p>
        <ui-button slot="footer">Cancel</ui-button>
        <ui-button slot="footer" variant="danger">Delete folder</ui-button>
      </ui-dialog>
    </div>
    <div class="dst-scrim">
      <ui-dialog title="Move link to Unsorted?" closeLabel="Close">
        <p class="dst-text">The link leaves its folder and goes back to Unsorted.</p>
        <ui-button slot="footer">Cancel</ui-button>
        <ui-button slot="footer" variant="primary">Move link</ui-button>
      </ui-dialog>
    </div>
    <div class="dst-scrim">
      <ui-dialog title="Edit link" size="md" closeLabel="Close">
        <p class="dst-text">A medium dialog holds a short form.</p>
        <ui-button slot="footer">Cancel</ui-button>
        <ui-button slot="footer" variant="primary">Save link</ui-button>
      </ui-dialog>
    </div>
  </div>`;

const controlsFrame = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="dst-gallery">
    <p class="dst-hint">${theme} theme: 24px icons in the close button, select, chip and Delete button</p>
    <div class="dst-scrim">
      <ui-dialog title="Edit link" size="md" closeLabel="Close">
        <ui-select label="Folder" [options]="folders" emptyLabel="Unsorted" searchLabel="Search folders" noResultsLabel="No folders" />
        <ui-chip removable removeLabel="Remove tag angular">angular</ui-chip>
        <ui-button slot="footer" variant="danger" iconLeft="trash">Delete</ui-button>
        <ui-button slot="footer">Cancel</ui-button>
        <ui-button slot="footer" variant="primary">Save changes</ui-button>
      </ui-dialog>
    </div>
  </div>`;

/** Icons are 24px inside a dialog and the footer buttons are 16px apart (Delete group included). */
export const DialogControls: Story = {
  render: () => ({
    props: { folders: [{ id: 'work', name: 'Work' }] },
    moduleMetadata: { imports: [DialogComponent, ButtonComponent, SelectComponent, ChipComponent] },
    template: Object.values(THEME).map(controlsFrame).join(''),
  }),
};

/** Both themes: destructive and plain confirmations and a medium dialog. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports: [DialogComponent, ButtonComponent] },
    template: `${Object.values(THEME).map(frame).join('')}`,
  }),
};
