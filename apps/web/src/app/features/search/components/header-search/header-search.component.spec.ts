import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MOCK_LIBRARY_COUNTS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { SearchDialogService } from '../../services/search-dialog.service';
import { SearchFieldService } from '../../services/search-field.service';
import { HeaderSearchComponent } from './header-search.component';

async function setup(wide: boolean) {
  const wideSignal = signal(wide);
  const search = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: ViewportService, useValue: { wide: wideSignal } },
      { provide: SearchDialogService, useValue: search },
      {
        provide: LINKS_API,
        useValue: { list: () => of({ items: [], nextCursor: null, pinned: [] }) },
      },
      {
        provide: FOLDERS_API,
        useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
      },
      { provide: TAGS_API, useValue: { list: () => of([]) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(HeaderSearchComponent);
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  return { fixture, search, wide: wideSignal, element: fixture.nativeElement as HTMLElement };
}

describe('HeaderSearchComponent', () => {
  afterEach(() => document.querySelector('app-header-search')?.remove());

  it('is a real search field from 80em, and no button', async () => {
    const { element } = await setup(true);

    expect(element.querySelector('input[role="combobox"]')).not.toBeNull();
    expect(element.querySelector('button')).toBeNull();
    expect(element.classList.contains('header-search--field')).toBe(true);
  });

  it('is a compact "Search" button with the shortcut hint below 80em, and no field', async () => {
    const { element, search } = await setup(false);

    const button = element.querySelector('button')!;
    expect(element.querySelector('input')).toBeNull();
    expect(button.textContent).toContain('Search');
    expect(button.querySelector('kbd')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');

    button.click();
    expect(search.open).toHaveBeenCalledTimes(1);
  });

  it('switches structurally when the width crosses 80em', async () => {
    const { element, fixture, wide } = await setup(false);

    wide.set(true);
    await fixture.whenStable();

    expect(element.querySelector('input[role="combobox"]')).not.toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('registers the field for the shortcut while it is there', async () => {
    const { element, fixture, wide } = await setup(true);
    const registry = TestBed.inject(SearchFieldService);

    expect(registry.focus()).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('input'));

    wide.set(false);
    await fixture.whenStable();
    expect(registry.focus()).toBe(false);

    fixture.destroy();
    expect(registry.focus()).toBe(false);
  });
});
