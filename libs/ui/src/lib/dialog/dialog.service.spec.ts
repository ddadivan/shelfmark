import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from '../button/button.component';
import { DialogComponent } from './dialog.component';
import { UiDialogRef } from './dialog-ref';
import { DialogService } from './dialog.service';
import { injectDialogData } from './inject-dialog-data';
import type { ConfirmDialogConfig } from './models/confirm-config.interface';
import { KEYBOARD_KEY } from '../keyboard';
import { DIALOG_SIZE } from './models/dialog-size.const';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../overlay/overlay-layer';

interface EditData {
  readonly name: string;
}

@Component({
  imports: [DialogComponent, ButtonComponent],
  template: `
    <ui-dialog title="Edit folder" closeLabel="Close" size="md">
      <p id="edit-desc">Rename “{{ data.name }}”</p>
      <input id="edit-input" aria-label="Name" />
      <ui-button slot="footer" (click)="ref.close('cancelled')">Cancel</ui-button>
      <ui-button slot="footer" variant="primary" (click)="ref.close('saved')">Save</ui-button>
    </ui-dialog>
  `,
})
class EditDialogComponent {
  protected readonly data = injectDialogData<EditData>();
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
}

/** Same shape as the form story: a plain <form> around the dialog, Cancel left of the submit. */
@Component({
  imports: [DialogComponent, ButtonComponent],
  template: `
    <form (submit)="$event.preventDefault(); ref.close('saved')">
      <ui-dialog title="Edit link" closeLabel="Close">
        <input id="form-input" aria-label="Link" />
        <ui-button slot="footer" (click)="ref.close('cancelled')">Cancel</ui-button>
        <ui-button slot="footer" variant="primary" type="submit">Save link</ui-button>
      </ui-dialog>
    </form>
  `,
})
class FormDialogComponent {
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
}

const confirmConfig: ConfirmDialogConfig = {
  title: 'Delete folder “Work”?',
  message: 'It has 12 links.',
  confirmLabel: 'Delete folder',
  cancelLabel: 'Cancel',
  closeLabel: 'Close',
};

function settle(): void {
  TestBed.tick();
}

async function closed(): Promise<void> {
  await vi.waitFor(() => {
    settle();
    expect(document.querySelector('.cdk-dialog-container')).toBeNull();
  });
}

function container(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.cdk-dialog-container');
  if (!element) {
    throw new Error('no dialog open');
  }
  return element;
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(container().querySelectorAll('button')).find(
    (element) => element.textContent.trim() === label || element.ariaLabel === label,
  );
  if (!found) {
    throw new Error(`no button "${label}"`);
  }
  return found;
}

function press(key: string): void {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('DialogService', () => {
  let service: DialogService;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    service = TestBed.inject(DialogService);
    trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();
  });

  afterEach(() => {
    trigger.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.remove();
    });
    vi.unstubAllGlobals();
  });

  describe('open', () => {
    it('renders the component with role, labelling and the dialog layer on the host element', () => {
      const ref = service.open<EditDialogComponent, string, EditData>(EditDialogComponent, {
        size: DIALOG_SIZE.Md,
        data: { name: 'Work' },
        describedBy: 'edit-desc',
      });
      settle();
      const root = container();
      expect(root.getAttribute('role')).toBe('dialog');
      expect(root.getAttribute('aria-modal')).toBe('true');
      const title = root.querySelector('h2');
      expect(title?.textContent).toBe('Edit folder');
      expect(root.getAttribute('aria-labelledby')).toBe(title?.id);
      expect(root.getAttribute('aria-describedby')).toBe('edit-desc');
      expect(root.textContent).toContain('Rename “Work”');
      expect(root.querySelector('.ui-dialog--md')).not.toBeNull();
      // Layer class on the CDK host element (the stacking context), also on the scrim.
      expect(ref.hostElement.classList.contains(overlayLayerClass(OVERLAY_LAYER.Dialog))).toBe(
        true,
      );
      expect(ref.hostElement.classList.contains('cdk-global-overlay-wrapper')).toBe(true);
      const scrim = document.querySelector('.ui-dialog-scrim');
      expect(scrim?.classList.contains(overlayLayerClass(OVERLAY_LAYER.Dialog))).toBe(true);
      ref.close();
    });

    it('takes the size from the open options when ui-dialog sets none', () => {
      @Component({
        imports: [DialogComponent],
        template: `<ui-dialog title="Sized" />`,
      })
      class SizedComponent {}
      const ref = service.open(SizedComponent, { size: DIALOG_SIZE.Md });
      settle();
      expect(container().querySelector('.ui-dialog--md')).not.toBeNull();
      ref.close();
    });

    it('locks page scroll while open', () => {
      // The CDK block strategy only engages when the page can scroll.
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 5000,
      });
      const ref = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(true);
      ref.close();
      Reflect.deleteProperty(document.documentElement, 'scrollHeight');
    });

    it('moves focus into the dialog, traps it and returns it to the trigger', async () => {
      const ref = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      await vi.waitFor(() => {
        settle();
        expect(container().contains(document.activeElement)).toBe(true);
      });
      // The trap anchors keep Tab inside.
      expect(document.querySelectorAll('.cdk-visually-hidden.cdk-focus-trap-anchor').length).toBe(
        2,
      );
      ref.close();
      await closed();
      expect(document.activeElement).toBe(trigger);
    });

    it('closes with a result through the injected ref', async () => {
      const ref = service.open<EditDialogComponent, string, EditData>(EditDialogComponent, {
        data: { name: 'x' },
      });
      const seen: (string | undefined)[] = [];
      ref.afterClosed().subscribe((value) => seen.push(value));
      settle();
      button('Save').click();
      await closed();
      expect(await ref.result).toBe('saved');
      expect(seen).toEqual(['saved']);
      expect(ref.componentInstance).toBeNull();
    });

    it('closes on Esc and on a scrim click, with no result', async () => {
      const first = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      press(KEYBOARD_KEY.Escape);
      await closed();
      expect(await first.result).toBeUndefined();

      const second = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click();
      await closed();
      expect(await second.result).toBeUndefined();
    });

    it('ignores the scrim with scrimClose false but still closes on Esc', async () => {
      const ref = service.open(EditDialogComponent, {
        data: { name: 'x' },
        scrimClose: false,
      });
      settle();
      document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click();
      settle();
      expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
      expect(container().contains(document.activeElement)).toBe(true);
      press(KEYBOARD_KEY.Escape);
      await closed();
      expect(ref.isClosing).toBe(true);
    });

    it('is blocking with dismissible false: neither Esc nor the scrim close it', async () => {
      const ref = service.open(EditDialogComponent, {
        data: { name: 'x' },
        dismissible: false,
      });
      settle();
      press(KEYBOARD_KEY.Escape);
      document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click();
      settle();
      expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
      ref.close();
      await closed();
    });

    it('ignores a second close() and a close() after it closed', async () => {
      const ref = service.open<EditDialogComponent, string, EditData>(EditDialogComponent, {
        data: { name: 'x' },
      });
      settle();
      ref.close('a');
      ref.close('b');
      await closed();
      ref.close('c');
      expect(await ref.result).toBe('a');
    });

    it('waits for the leave animation before it removes the overlay', async () => {
      const ref = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      let finish: () => void = () => undefined;
      const finished = new Promise<Animation>((resolve) => {
        finish = () => {
          resolve({} as Animation);
        };
      });
      const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane');
      if (!pane) {
        throw new Error('no pane');
      }
      pane.getAnimations = () => [{ finished } as unknown as Animation];
      ref.close();
      expect(ref.leaving()).toBe(true);
      settle();
      expect(container().querySelector('.ui-dialog--leave')).not.toBeNull();
      expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
      finish();
      await closed();
    });

    it('is closed by the CDK when its injector goes away (closeAll)', async () => {
      const ref = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      TestBed.inject(DialogService);
      // The CDK path: `closed` still resolves the ref.
      const cdk = (await import('@angular/cdk/dialog')).Dialog;
      TestBed.inject(cdk).closeAll();
      await closed();
      expect(await ref.result).toBeUndefined();
    });

    it('has no axe violations while open', async () => {
      const ref = service.open(EditDialogComponent, { data: { name: 'x' } });
      settle();
      expect(await axeViolations(container())).toEqual([]);
      ref.close();
    });
  });

  describe('form inside a dialog', () => {
    it('keeps a plain form with no role, and the submit button is its default button', () => {
      service.open(FormDialogComponent);
      settle();
      const form = container().querySelector('form');
      expect(form).not.toBeNull();
      expect(form?.hasAttribute('role')).toBe(false);
      expect(form?.ariaLabel).toBeNull();
      const buttons = Array.from(form?.querySelectorAll('button') ?? []);
      // Enter in a field triggers the first submit button of the form: it must be "Save link".
      expect(buttons.find((element) => element.type === 'submit')?.textContent.trim()).toBe(
        'Save link',
      );
      expect(button('Cancel').type).toBe('button');
    });

    it('submits through a click on the default submit button (Enter is not available in jsdom) and closes with the result', async () => {
      const ref = service.open<FormDialogComponent, string>(FormDialogComponent);
      settle();
      // Enter in a field makes the browser click the default (first submit) button.
      container().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      await closed();
      expect(await ref.result).toBe('saved');
    });
  });

  describe('confirm', () => {
    it('resolves true for the confirm button', async () => {
      const answer = service.confirm(confirmConfig);
      settle();
      button('Delete folder').click();
      await closed();
      expect(await answer).toBe(true);
    });

    it.each([
      ['Cancel', () => button('Cancel').click()],
      ['the close button', () => button('Close').click()],
      ['Esc', () => press(KEYBOARD_KEY.Escape)],
      ['a scrim click', () => document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click()],
    ])('resolves false for %s', async (_name, act) => {
      const answer = service.confirm(confirmConfig);
      settle();
      act();
      await closed();
      expect(await answer).toBe(false);
    });

    it('shows the texts, labels the dialog and focuses the confirm button', async () => {
      const answer = service.confirm(confirmConfig);
      settle();
      await vi.waitFor(() => {
        settle();
        expect(document.activeElement).toBe(button('Delete folder'));
      });
      const root = container();
      expect(root.getAttribute('role')).toBe('dialog');
      expect(root.querySelector('h2')?.textContent).toBe(confirmConfig.title);
      const text = root.querySelector('.ui-confirm-dialog__text');
      expect(text?.textContent).toBe(confirmConfig.message);
      expect(root.getAttribute('aria-describedby')).toBe(text?.id);
      expect(root.querySelector('.ui-button--primary')).not.toBeNull();
      // Cancel sits left of the main action.
      const buttons = Array.from(root.querySelectorAll('.ui-dialog__foot button'));
      expect(buttons.map((element) => element.textContent.trim())).toEqual([
        'Cancel',
        'Delete folder',
      ]);
      expect(await axeViolations(root)).toEqual([]);
      button('Cancel').click();
      await closed();
      expect(await answer).toBe(false);
    });

    it('omits the close button without a closeLabel', async () => {
      const answer = service.confirm({ ...confirmConfig, closeLabel: undefined });
      settle();
      expect(container().querySelectorAll('button').length).toBe(2);
      button('Cancel').click();
      await closed();
      await answer;
    });

    it('destructive: alertdialog, red button, scrim ignored, Cancel focused, Esc still closes', async () => {
      const answer = service.confirm({ ...confirmConfig, destructive: true });
      settle();
      await vi.waitFor(() => {
        settle();
        expect(document.activeElement).toBe(button('Cancel'));
      });
      const root = container();
      expect(root.getAttribute('role')).toBe('alertdialog');
      expect(root.querySelector('.ui-button--danger')).not.toBeNull();
      document.querySelector<HTMLElement>('.ui-dialog-scrim')?.click();
      settle();
      expect(document.querySelector('.cdk-dialog-container')).not.toBeNull();
      expect(await axeViolations(root)).toEqual([]);
      press(KEYBOARD_KEY.Escape);
      await closed();
      expect(await answer).toBe(false);
    });

    it('destructive: the confirm button still resolves true', async () => {
      const answer = service.confirm({ ...confirmConfig, destructive: true });
      settle();
      button('Delete folder').click();
      await closed();
      expect(await answer).toBe(true);
    });
  });
});
