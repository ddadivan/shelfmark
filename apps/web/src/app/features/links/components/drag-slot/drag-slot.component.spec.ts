import { TestBed } from '@angular/core/testing';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { DragSlotComponent } from './drag-slot.component';

async function setup(compact = false) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(DragSlotComponent);
  fixture.componentRef.setInput('title', 'Progressive disclosure');
  fixture.componentRef.setInput('compact', compact);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('DragSlotComponent', () => {
  it('shows the move glyph, "Moving" and the title of the carried link', async () => {
    const element = await setup();

    expect(element.querySelector('ui-icon[name="folder-move"]')).not.toBeNull();
    expect(element.querySelector('.drag-slot__label')?.textContent?.trim()).toBe('Moving');
    expect(element.querySelector('.drag-slot__title')?.textContent?.trim()).toBe(
      'Progressive disclosure',
    );
    expect(element.classList).not.toContain('drag-slot--compact');
  });

  it('is decorative: hidden from screen readers (the feed announces the drag)', async () => {
    const element = await setup();

    expect(element.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks the one-line list version', async () => {
    const element = await setup(true);

    expect(element.classList).toContain('drag-slot--compact');
    expect(element.textContent).toContain('Moving');
  });
});
