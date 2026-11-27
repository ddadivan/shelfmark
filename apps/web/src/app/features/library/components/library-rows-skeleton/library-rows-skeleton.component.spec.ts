import { TestBed } from '@angular/core/testing';
import { LibraryRowsSkeletonComponent } from './library-rows-skeleton.component';

async function render(headlines: boolean): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(LibraryRowsSkeletonComponent);
  fixture.componentRef.setInput('headlines', headlines);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('LibraryRowsSkeletonComponent', () => {
  it('draws list rows with the 72 x 48 picture and two text lines', async () => {
    const element = await render(false);
    expect(element.classList.contains('rows-sk--headlines')).toBe(false);
    expect(element.querySelectorAll('.rows-sk__row').length).toBeGreaterThan(8);
    expect(element.querySelector('.rows-sk__headline')).toBeNull();
    const row = element.querySelector('.rows-sk__row');
    expect(row?.querySelector('.rows-sk__thumb')).not.toBeNull();
    expect(row?.querySelector('.rows-sk__line--title')).not.toBeNull();
    expect(row?.querySelector('.rows-sk__line--meta')).not.toBeNull();
  });

  it('draws headline rows in one panel with the domain, folder and date columns', async () => {
    const element = await render(true);
    expect(element.classList.contains('rows-sk--headlines')).toBe(true);
    expect(element.querySelector('.rows-sk__row')).toBeNull();
    expect(element.querySelectorAll('.rows-sk__headline').length).toBeGreaterThan(15);
    const row = element.querySelector('.rows-sk__headline');
    expect(row?.querySelector('.rows-sk__favicon')).not.toBeNull();
    for (const column of ['domain', 'folder', 'date']) {
      expect(row?.querySelector(`.rows-sk__col--${column}`)).not.toBeNull();
    }
  });
});
