import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BULK_BAR_LAYOUT, BulkBarComponent, type BulkBarAction } from '@shelfmark/ui';
import { BulkBarFitDirective } from './bulk-bar-fit.directive';

const ACTIONS: BulkBarAction[] = [
  { id: 'move', label: 'Перемістити', icon: 'folder' },
  { id: 'tags', label: 'Теги', icon: 'tag' },
  { id: 'delete', label: 'Видалити', icon: 'trash', danger: true },
];

@Component({
  imports: [BulkBarComponent, BulkBarFitDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="parent">
      <ui-bulk-bar
        #fit="appBulkBarFit"
        ariaLabel="Actions"
        [appBulkBarFit]="actions()"
        [actions]="actions()"
        [layout]="fit.stacked() ? BULK_BAR_LAYOUT.Stacked : BULK_BAR_LAYOUT.Inline"
      />
    </div>
  `,
})
class HostComponent {
  protected readonly BULK_BAR_LAYOUT = BULK_BAR_LAYOUT;
  readonly actions = signal(ACTIONS);
}

/**
 * jsdom has no layout: the bar's widths come from these numbers. Inline, the bar needs `content`
 * and is as wide as `room`; stacked it always fits.
 */
const size = { content: 900, room: 1000 };
let resize: () => void = () => undefined;

function stubLayout(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.classList.contains('ui-bulk-bar__bar')) return 0;
      const stacked = this.closest('.ui-bulk-bar--stacked') !== null;
      return stacked ? Math.min(size.content, size.room) : size.content;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('parent')) return size.room;
      if (this.classList.contains('ui-bulk-bar__bar')) return Math.min(size.content, size.room);
      return 0;
    },
  });
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const bulkBar = (): HTMLElement => fixture.nativeElement.querySelector('ui-bulk-bar');
  const stacked = (): boolean => bulkBar().classList.contains('ui-bulk-bar--stacked');
  const changeSize = async (next: Partial<typeof size>): Promise<void> => {
    Object.assign(size, next);
    resize();
    await fixture.whenStable();
  };
  return { fixture, stacked, changeSize };
}

describe('BulkBarFitDirective', () => {
  beforeEach(() => {
    size.content = 900;
    size.room = 1000;
    stubLayout();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  });

  it('keeps the inline bar while it fits', async () => {
    const { stacked } = await setup();
    expect(stacked()).toBe(false);
  });

  it('stacks when the inline bar is wider than its room, and goes back once it fits', async () => {
    const { stacked, changeSize } = await setup();
    await changeSize({ room: 800 });
    expect(stacked()).toBe(true);
    // Still narrower than the inline bar needs: stays stacked.
    await changeSize({ room: 880 });
    expect(stacked()).toBe(true);
    await changeSize({ room: 920 });
    expect(stacked()).toBe(false);
  });

  it('measures new actions inline again', async () => {
    const { fixture, stacked, changeSize } = await setup();
    await changeSize({ room: 800 });
    expect(stacked()).toBe(true);
    size.content = 700;
    fixture.componentInstance.actions.set(ACTIONS.slice(1));
    await fixture.whenStable();
    expect(stacked()).toBe(false);
  });
});
