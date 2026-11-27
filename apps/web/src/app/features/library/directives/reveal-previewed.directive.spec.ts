import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LinkPreviewService } from '../../link-preview/services/link-preview.service';
import { LibraryFeedService } from '../services/library-feed.service';
import { RevealPreviewedDirective } from './reveal-previewed.directive';

const ROW_HEIGHT = 64;
const AREA_HEIGHT = 300;
const ROWS = 20;

@Component({
  selector: 'app-reveal-host',
  imports: [RevealPreviewedDirective],
  template: `
    <app-sidebar><button type="button" class="folder">Clothes</button></app-sidebar>
    <div appRevealPreviewed class="area">
      @for (id of ids; track id) {
        <div [attr.data-link-id]="id">
          <a class="ui-list-item__link" href="#">{{ id }}</a>
        </div>
      }
    </div>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly ids = Array.from({ length: ROWS }, (_, i) => `link-${i}`);
}

/** jsdom has no layout: rows sit one under another, the area shows AREA_HEIGHT from its scrollTop. */
function layOut(area: HTMLElement): void {
  area.getBoundingClientRect = () => new DOMRect(0, 0, 400, AREA_HEIGHT);
  area.querySelectorAll<HTMLElement>('[data-link-id]').forEach((row, index) => {
    row.getBoundingClientRect = () =>
      new DOMRect(0, index * ROW_HEIGHT - area.scrollTop, 400, ROW_HEIGHT);
  });
}

async function setup() {
  const split = signal(true);
  const currentId = signal<string | null>(null);
  const shownLinks = signal<readonly unknown[]>([]);
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      { provide: LinkPreviewService, useValue: { split, currentId } },
      { provide: LibraryFeedService, useValue: { shownLinks } },
    ],
  });
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const area = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.area');
  if (area === null) {
    throw new Error('no area');
  }
  layOut(area);
  const show = async (id: string | null): Promise<void> => {
    currentId.set(id);
    await fixture.whenStable();
  };
  const host = fixture.nativeElement as HTMLElement;
  return { area, host, split, show };
}

describe('RevealPreviewedDirective', () => {
  it('scrolls the row of a newly opened preview to the top of the list', async () => {
    const { area, show } = await setup();
    await show('link-10');
    expect(area.scrollTop).toBe(10 * ROW_HEIGHT - 8);
  });

  it('then scrolls only as far as needed when the preview moves to the next row', async () => {
    const { area, show } = await setup();
    await show('link-10');
    const top = area.scrollTop;
    await show('link-11');
    expect(area.scrollTop).toBe(top);
    await show('link-15');
    // Row 15 ends at 16 rows; the area shows AREA_HEIGHT from its top: scroll just past it.
    expect(area.scrollTop).toBe(16 * ROW_HEIGHT - AREA_HEIGHT + 8);
  });

  it('scrolls back up when the preview moves above the visible rows', async () => {
    const { area, show } = await setup();
    await show('link-10');
    await show('link-2');
    expect(area.scrollTop).toBe(2 * ROW_HEIGHT - 8);
  });

  it('does nothing while the preview is not side by side', async () => {
    const { area, split, show } = await setup();
    split.set(false);
    await show('link-10');
    expect(area.scrollTop).toBe(0);
  });

  it('moves a focus left in the sidebar to the opened row, so the arrows follow the list', async () => {
    const { host, show } = await setup();
    host.querySelector<HTMLElement>('.folder')?.focus();
    await show('link-3');
    expect(document.activeElement?.textContent?.trim()).toBe('link-3');
  });

  it('leaves a focus elsewhere in the page alone', async () => {
    const { host, show } = await setup();
    const field = document.createElement('input');
    host.append(field);
    field.focus();
    await show('link-3');
    expect(document.activeElement).toBe(field);
  });
});
