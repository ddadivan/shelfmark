import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { DialogComponent } from './dialog.component';
import { DialogService } from './dialog.service';
import type { DialogSize } from './models/dialog-size.type';

@Component({
  imports: [DialogComponent],
  template: `
    <ui-dialog
      title="Add link"
      [size]="size()"
      [closeLabel]="closeLabel()"
      (closeRequested)="closes.set(closes() + 1)"
    >
      <p>Body text</p>
      <button slot="footer" type="button">Cancel</button>
      <button slot="footer" type="button">Save</button>
    </ui-dialog>
  `,
})
class HostComponent {
  readonly size = signal<DialogSize | undefined>(undefined);
  readonly closeLabel = signal<string | undefined>('Close');
  readonly closes = signal(0);
}

@Component({
  imports: [DialogComponent],
  template: `<ui-dialog title="Sheet" closeLabel="Close"><p>Body</p></ui-dialog>`,
})
class SheetComponent {}

function stubMatchMedia(phone: boolean): { change: (matches: boolean) => void } {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query.includes('40em'),
    media: query,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  }));
  return {
    change: (matches) => {
      listeners.forEach((listener) => {
        listener({ matches } as MediaQueryListEvent);
      });
    },
  };
}

function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientY: number,
  timeStamp: number,
): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
}

async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  root: HTMLElement;
}> {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  TestBed.tick();
  await fixture.whenStable();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

describe('DialogComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
      element.remove();
    });
  });

  it('renders the title, body and footer slots', async () => {
    stubMatchMedia(false);
    const { root } = await setup();
    expect(root.querySelector('h2')?.textContent).toBe('Add link');
    expect(root.querySelector('.ui-dialog__body')?.textContent).toContain('Body text');
    expect(root.querySelectorAll('.ui-dialog__foot button').length).toBe(2);
  });

  it('does not leave a native tooltip on the host', async () => {
    stubMatchMedia(false);
    const { root } = await setup();
    expect(root.querySelector('ui-dialog')?.hasAttribute('title')).toBe(false);
  });

  it('is sm by default and md with size', async () => {
    stubMatchMedia(false);
    const { fixture, root } = await setup();
    expect(root.querySelector('.ui-dialog--md')).toBeNull();
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(root.querySelector('.ui-dialog--md')).not.toBeNull();
  });

  it('has a close button only with closeLabel, named by it', async () => {
    stubMatchMedia(false);
    const { fixture, root } = await setup();
    const close = root.querySelector<HTMLButtonElement>('.ui-dialog__head button');
    expect(close?.ariaLabel).toBe('Close');
    close?.click();
    expect(fixture.componentInstance.closes()).toBe(1);
    fixture.componentInstance.closeLabel.set(undefined);
    fixture.detectChanges();
    expect(root.querySelector('.ui-dialog__head button')).toBeNull();
  });

  it('has no axe violations', async () => {
    stubMatchMedia(false);
    const { root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
  });

  it('makes an overflowing body a focusable labelled region', async () => {
    stubMatchMedia(false);
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(): void {
          return;
        }
        disconnect(): void {
          return;
        }
      },
    );
    const { fixture, root } = await setup();
    const body = root.querySelector<HTMLElement>('.ui-dialog__body');
    expect(body?.hasAttribute('tabindex')).toBe(false);
    Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(body, 'clientHeight', { configurable: true, value: 300 });
    notify();
    fixture.detectChanges();
    expect(body?.getAttribute('tabindex')).toBe('0');
    expect(body?.getAttribute('role')).toBe('region');
    expect(body?.getAttribute('aria-labelledby')).toBe(root.querySelector('h2')?.id);
    expect(await axeViolations(root)).toEqual([]);
  });

  describe('bottom sheet', () => {
    function drag(
      root: HTMLElement,
      height: number,
    ): {
      grip: HTMLElement;
      panel: HTMLElement;
    } {
      const grip = root.querySelector<HTMLElement>('.ui-dialog__drag');
      const panel = root.querySelector<HTMLElement>('.ui-dialog');
      if (!grip || !panel) {
        throw new Error('no sheet');
      }
      panel.getBoundingClientRect = () => ({ height }) as DOMRect;
      return { grip, panel };
    }

    it('follows the finger, closes past 30% of the height', async () => {
      stubMatchMedia(true);
      const { fixture, root } = await setup();
      const { grip, panel } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      fixture.detectChanges();
      expect(panel.classList.contains('ui-dialog--dragging')).toBe(true);
      pointer(grip, 'pointermove', 160, 100);
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('60px');
      pointer(grip, 'pointermove', 250, 400);
      pointer(grip, 'pointerup', 250, 500);
      fixture.detectChanges();
      expect(fixture.componentInstance.closes()).toBe(1);
      expect(panel.classList.contains('ui-dialog--dragging')).toBe(false);
      // The leave animation starts from where the finger left it.
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('150px');
    });

    it('closes on a fast flick', async () => {
      stubMatchMedia(true);
      const { fixture, root } = await setup();
      const { grip } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      pointer(grip, 'pointermove', 140, 40);
      pointer(grip, 'pointerup', 140, 50);
      expect(fixture.componentInstance.closes()).toBe(1);
    });

    it('snaps back when released early and slowly', async () => {
      stubMatchMedia(true);
      const { fixture, root } = await setup();
      const { grip, panel } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      pointer(grip, 'pointermove', 160, 600);
      pointer(grip, 'pointerup', 160, 1200);
      fixture.detectChanges();
      expect(fixture.componentInstance.closes()).toBe(0);
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
      expect(panel.classList.contains('ui-dialog--snapping')).toBe(true);
    });

    it('does not count a fast move followed by a pause as a flick', async () => {
      stubMatchMedia(true);
      const { fixture, root } = await setup();
      const { grip } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      pointer(grip, 'pointermove', 120, 10);
      pointer(grip, 'pointermove', 140, 20);
      pointer(grip, 'pointerup', 140, 400);
      expect(fixture.componentInstance.closes()).toBe(0);
    });

    it('never moves up and snaps back on cancel', async () => {
      stubMatchMedia(true);
      const { fixture, root } = await setup();
      const { grip, panel } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      pointer(grip, 'pointermove', 40, 600);
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
      pointer(grip, 'pointermove', 140, 1200);
      pointer(grip, 'pointercancel', 140, 1300);
      fixture.detectChanges();
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
      expect(panel.classList.contains('ui-dialog--snapping')).toBe(true);
      expect(fixture.componentInstance.closes()).toBe(0);
    });

    it('does not start a drag on the close button', async () => {
      stubMatchMedia(true);
      const { root } = await setup();
      const { panel } = drag(root, 400);
      const close = root.querySelector('.ui-dialog__head button') as HTMLElement;
      pointer(close, 'pointerdown', 100, 0);
      expect(panel.classList.contains('ui-dialog--dragging')).toBe(false);
    });

    it('ignores other pointers while a drag runs', async () => {
      stubMatchMedia(true);
      const { root } = await setup();
      const { grip, panel } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      const other = new MouseEvent('pointermove', { bubbles: true, clientY: 300 });
      Object.defineProperty(other, 'pointerId', { value: 2 });
      grip.dispatchEvent(other);
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('');
      pointer(grip, 'pointermove', 120, 50);
      expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('20px');
    });

    it('does not drag on tablet and desktop', async () => {
      stubMatchMedia(false);
      const { root } = await setup();
      const { grip, panel } = drag(root, 400);
      pointer(grip, 'pointerdown', 100, 0);
      expect(panel.classList.contains('ui-dialog--dragging')).toBe(false);
    });

    it('follows the breakpoint while open and uses a 44px close button on a phone', async () => {
      const media = stubMatchMedia(true);
      const { fixture, root } = await setup();
      expect(root.querySelector('.ui-button--lg')).not.toBeNull();
      media.change(false);
      fixture.detectChanges();
      expect(root.querySelector('.ui-button--lg')).toBeNull();
      expect(root.querySelector('.ui-button--sm')).not.toBeNull();
    });

    it('closes the dialog opened by the service when dragged shut', async () => {
      stubMatchMedia(true);
      const ref = TestBed.inject(DialogService).open(SheetComponent);
      TestBed.tick();
      const root = document.querySelector<HTMLElement>('.cdk-dialog-container');
      if (!root) {
        throw new Error('no dialog');
      }
      const { grip } = drag(root, 300);
      pointer(grip, 'pointerdown', 0, 0);
      pointer(grip, 'pointermove', 200, 100);
      pointer(grip, 'pointerup', 200, 150);
      expect(ref.isClosing).toBe(true);
      await vi.waitFor(() => {
        TestBed.tick();
        expect(document.querySelector('.cdk-dialog-container')).toBeNull();
      });
    });
  });
});
