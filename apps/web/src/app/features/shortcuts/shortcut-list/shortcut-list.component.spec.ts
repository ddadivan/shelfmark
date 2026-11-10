import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { SHORTCUT_GROUPS } from '../models/shortcut-groups.const';
import { ShortcutListComponent } from './shortcut-list.component';

async function setup(index: number): Promise<ComponentFixture<ShortcutListComponent>> {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(ShortcutListComponent);
  fixture.componentRef.setInput('group', SHORTCUT_GROUPS[index]);
  await fixture.whenStable();
  return fixture;
}

describe('ShortcutListComponent', () => {
  it('lists what each shortcut does with its keys as kbd caps', async () => {
    const fixture = await setup(0);
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));

    expect(rows.map((row) => row.querySelector('.shortcut-list__label')?.textContent)).toEqual([
      'Search',
      'This list',
      'Close a dialog, menu or toast',
      'Undo the last action',
      'Go to the button of a toast',
    ]);
    expect(rows[0]?.querySelectorAll('kbd')).toHaveLength(2);
    expect(rows[1]?.querySelector('kbd')?.textContent).toContain('?');
  });

  it('names symbol caps for screen readers and hides the symbol', async () => {
    const fixture = await setup(2);
    const cap = (fixture.nativeElement as HTMLElement).querySelector('kbd');

    expect(cap?.querySelector('[aria-hidden="true"]')?.textContent).toBe('↑');
    expect(cap?.querySelector('.shortcut-list__sr')?.textContent).toBe('Up');
  });

  it('has no axe violations', async () => {
    const fixture = await setup(1);

    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
  });
});
