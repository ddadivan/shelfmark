import { TestBed } from '@angular/core/testing';
import { UI_DIALOG_DATA, UiDialogRef } from '@shelfmark/ui';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { axeViolations } from '../../../../../testing/axe';
import type { BulkTagsDialogData } from '../../models/bulk-tags-dialog-data.interface';
import { BulkTagsDialogComponent } from './bulk-tags-dialog.component';

const DATA: BulkTagsDialogData = {
  heading: 'Tags for 3 links',
  total: 3,
  tags: [
    { name: 'angular', count: 3 },
    { name: 'reading', count: 2 },
    { name: 'video', count: 0 },
  ],
};

async function setup() {
  const ref = { close: vi.fn(), locked: () => false };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: UiDialogRef, useValue: ref },
      { provide: UI_DIALOG_DATA, useValue: DATA },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(BulkTagsDialogComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const boxes = () => [...root.querySelectorAll<HTMLInputElement>('ui-checkbox input')];
  const button = (text: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('ui-button button')].find((b) =>
      b.textContent?.includes(text),
    );
  return { fixture, root, ref, boxes, button };
}

describe('BulkTagsDialogComponent', () => {
  it('ticks a tag on all links, dashes one on some, with their counts', async () => {
    const { root, boxes, button } = await setup();

    expect(boxes().map((box) => box.checked)).toEqual([true, false, false]);
    expect(boxes()[1]?.indeterminate).toBe(true);
    const counts = [...root.querySelectorAll('.bulk-tags__count')].map((c) =>
      c.textContent?.trim(),
    );
    expect(counts).toEqual(['on all 3', 'on 2 of 3']);
    expect(button('Apply to 3 links')?.disabled).toBe(true);
  });

  it('adds a dashed or empty tag to all and takes a ticked one off all', async () => {
    const { fixture, boxes, button, ref } = await setup();

    boxes()[0]?.click();
    boxes()[1]?.click();
    boxes()[2]?.click();
    await fixture.whenStable();
    button('Apply to 3 links')?.click();

    expect(ref.close).toHaveBeenCalledWith({ add: ['reading', 'video'], remove: ['angular'] });
  });

  it('filters by the typed text and adds a new tag with Enter', async () => {
    const { fixture, root, button, ref } = await setup();
    const field = root.querySelector('ui-input input') as HTMLInputElement;

    field.value = 'vid';
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('ui-checkbox')).toHaveLength(1);

    field.value = 'signals';
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelector('ui-checkbox')?.textContent).toContain('signals');
    button('Apply to 3 links')?.click();

    expect(ref.close).toHaveBeenCalledWith({ add: ['signals'], remove: [] });
  });

  it('has no axe violations', async () => {
    const { root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});
