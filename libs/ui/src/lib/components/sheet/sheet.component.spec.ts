import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks } from '../../../testing/scss';
import { ButtonComponent } from '../button/button.component';
import { UiDialogRef } from '../../services/dialog/dialog-ref';
import { DialogService } from '../../services/dialog/dialog.service';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { SheetComponent } from './sheet.component';
import { SHEET_HEIGHT } from './models/sheet-height.const';
import type { SheetHeight } from './models/sheet-height.type';

@Component({
  imports: [SheetComponent, ButtonComponent],
  template: `
    <ui-sheet title="Recently opened" [height]="height()" [closeLabel]="closeLabel()">
      <ui-button slot="actions" variant="ghost" size="sm">Clear</ui-button>
      <p>Body text</p>
    </ui-sheet>
  `,
})
class HostComponent {
  readonly height = signal<SheetHeight>(SHEET_HEIGHT.Auto);
  readonly closeLabel = signal<string | undefined>('Close');
}

@Component({
  imports: [SheetComponent, ButtonComponent],
  template: `
    <ui-sheet title="Remind me" [height]="'tall'" closeLabel="Close">
      <ui-button slot="actions" variant="ghost" size="sm">Clear</ui-button>
      <button type="button" id="first">First</button>
    </ui-sheet>
  `,
})
class OpenedComponent {
  protected readonly ref = inject(UiDialogRef);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root };
}

describe('SheetComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.remove();
    });
  });

  it('renders the title, the actions next to the close button and the body', () => {
    const { root } = setup();
    expect(root.querySelector('h2')?.textContent).toBe('Recently opened');
    const end = root.querySelector('.ui-dialog__head-end');
    expect(end?.textContent).toContain('Clear');
    expect(end?.querySelectorAll('button').length).toBe(2);
    expect(root.querySelector('.ui-dialog__body')?.textContent).toContain('Body text');
    expect(root.querySelector('ui-sheet')?.hasAttribute('title')).toBe(false);
  });

  it('is an auto sheet by default and tall with height', () => {
    const { fixture, root } = setup();
    expect(root.querySelector('.ui-dialog--sheet')).not.toBeNull();
    expect(root.querySelector('.ui-dialog--sheet-tall')).toBeNull();
    fixture.componentInstance.height.set(SHEET_HEIGHT.Tall);
    fixture.detectChanges();
    expect(root.querySelector('.ui-dialog--sheet-tall')).not.toBeNull();
  });

  it('has a close button only with closeLabel', () => {
    const { fixture, root } = setup();
    fixture.componentInstance.closeLabel.set(undefined);
    fixture.detectChanges();
    expect(root.querySelectorAll('.ui-dialog__head-end button').length).toBe(1);
  });

  it('has no axe violations', async () => {
    const { root } = setup();
    expect(await axeViolations(root)).toEqual([]);
  });

  it('leaves 150px of the page above and rounds the top corners to 28px on a phone', () => {
    const css = compileScss('lib/components/dialog/dialog.component.scss');
    const phone = mediaBlocks(css, /width\s*<\s*40em/).join('\n');
    expect(phone).toMatch(/\.ui-dialog--sheet\s*\{[^}]*calc\(100dvh - 9\.375rem\)/);
    expect(phone).toMatch(/\.ui-dialog--sheet\s*\{[^}]*var\(--radius-xl\) var\(--radius-xl\) 0 0/);
    expect(phone).toMatch(/\.ui-dialog--sheet-tall\s*\{[^}]*height: calc\(100dvh - 9\.375rem\)/);
  });

  describe('opened through DialogService', () => {
    async function closed(): Promise<void> {
      await vi.waitFor(() => {
        TestBed.tick();
        expect(document.querySelector('.cdk-dialog-container')).toBeNull();
      });
    }

    it('is a dialog named by its title that closes with Esc and with the close button', async () => {
      const ref = TestBed.inject(DialogService).open(OpenedComponent);
      TestBed.tick();
      const container = document.querySelector<HTMLElement>('.cdk-dialog-container');
      const heading = container?.querySelector('h2');
      expect(container?.getAttribute('aria-labelledby')).toBe(heading?.id);
      expect(container?.getAttribute('aria-modal')).toBe('true');
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true, cancelable: true }),
      );
      await closed();
      expect(ref.isClosing).toBe(true);

      TestBed.inject(DialogService).open(OpenedComponent);
      TestBed.tick();
      document
        .querySelector<HTMLButtonElement>('.ui-dialog__head-end button[aria-label="Close"]')
        ?.click();
      await closed();
    });
  });
});
