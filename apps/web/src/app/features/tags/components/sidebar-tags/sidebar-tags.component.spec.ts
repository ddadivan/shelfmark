import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { TagResponse } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_NAME, MOCK_TAGS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { of } from 'rxjs';
import { TagsStore } from '../../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import type { TagsApi } from '../../../links/models/tags-api.interface';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import { SidebarTagsComponent } from './sidebar-tags.component';

async function setup(api?: TagsApi) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([{ path: 'links', children: [] }]),
      { provide: LINKS_API, useClass: MockLinksApi },
      api ? { provide: TAGS_API, useValue: api } : { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(TagsStore);
  const fixture = TestBed.createComponent(SidebarTagsComponent);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(store.loaded()).toBe(true);
  });
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, store, element, router: TestBed.inject(Router) };
}

function tag(name: string, linkCount: number): TagResponse {
  return { ...MOCK_TAGS[0], id: `id-${name}`, name, linkCount };
}

function chips(element: HTMLElement): string[] {
  return [...element.querySelectorAll('ui-chip[data-tag-id] .ui-chip__body')].map(
    (body) => body.textContent?.trim() ?? '',
  );
}

function chip(element: HTMLElement, name: string): HTMLElement {
  const found = [...element.querySelectorAll<HTMLElement>('ui-chip')].find(
    (item) => item.querySelector('.ui-chip__body')?.textContent?.trim() === name,
  );
  if (!found) {
    throw new Error(`no chip ${name}`);
  }
  return found;
}

function field(element: HTMLElement): HTMLInputElement | null {
  return element.querySelector<HTMLInputElement>('form input');
}

function type(element: HTMLElement, value: string): void {
  const control = field(element);
  if (!control) {
    throw new Error('no field');
  }
  control.value = value;
  control.dispatchEvent(new Event('input'));
  TestBed.tick();
}

function submit(element: HTMLElement): void {
  element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
  TestBed.tick();
}

function addButton(element: HTMLElement): HTMLButtonElement {
  const button = [...element.querySelectorAll('button')].find(
    (item) => item.getAttribute('aria-label') === 'New tag',
  );
  if (!button) {
    throw new Error('no add button');
  }
  return button;
}

async function until(check: () => void): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.tick();
      check();
    },
    { timeout: 3000 },
  );
}

async function openMenu(element: HTMLElement, name: string, item: string): Promise<void> {
  chip(element, name).dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }),
  );
  await until(() => {
    expect(document.querySelector('[role="menuitem"]')).not.toBeNull();
  });
  const entry = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
    el.textContent?.includes(item),
  );
  entry?.click();
  TestBed.tick();
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
    el.replaceChildren();
  });
});

describe('SidebarTagsComponent', () => {
  it('lists the tags as chips below a Tags heading', async () => {
    const { element } = await setup();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Tags');
    expect(chips(element)).toEqual(
      expect.arrayContaining([MOCK_NAME.TagDocs, MOCK_NAME.TagRecipes]),
    );
  });

  it('shows a short note without tags in the sidebar, the page empty state on the Tags tab', async () => {
    const api: TagsApi = {
      list: () => of([]),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      merge: vi.fn(),
    };
    const { element, fixture } = await setup(api);

    expect(element.querySelector('.tags__note')?.textContent).toContain('No tags yet');
    expect(element.querySelector('ui-empty-state')).toBeNull();

    fixture.componentRef.setInput('asPage', true);
    await fixture.whenStable();
    const state = element.querySelector('ui-empty-state');
    expect(state?.classList.contains('ui-empty-state--page')).toBe(true);
    expect(state?.querySelector('h2')?.textContent).toBe('No tags yet');
    expect(element.querySelector('.tags__list')?.classList).toContain('tags__list--empty');

    // Its button opens the new-tag field, like the + in the header.
    state?.querySelector('button')?.click();
    await fixture.whenStable();
    expect(field(element)).not.toBeNull();
    expect(element.querySelector('ui-empty-state')).toBeNull();
  });

  it('shows the 8 most used tags and folds the rest behind "+ N more"', async () => {
    const many = Array.from({ length: 11 }, (_, n) => tag(`t${n}`, 20 - n));
    const api: TagsApi = {
      list: () => of(many),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      merge: vi.fn(),
    };
    const { element, fixture } = await setup(api);

    expect(chips(element)).toHaveLength(8);
    const more = [...element.querySelectorAll('button')].find((b) =>
      /\+ 3 more/.test(b.textContent ?? ''),
    );
    expect(more?.closest('ui-chip')?.classList.contains('ui-chip--neutral')).toBe(true);
    expect(more?.getAttribute('aria-expanded')).toBe('false');

    more?.click();
    await fixture.whenStable();
    expect(chips(element)).toHaveLength(11);
    const less = [...element.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Show less',
    );
    less?.click();
    await fixture.whenStable();
    expect(chips(element)).toHaveLength(8);
  });

  it('opens a focused field with "+", and Esc closes it and returns focus to "+"', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);

    addButton(element).click();
    await fixture.whenStable();
    expect(field(element)).not.toBeNull();
    await until(() => {
      expect(document.activeElement).toBe(field(element));
    });

    element
      .querySelector('form')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(field(element)).toBeNull();
    await until(() => {
      expect(document.activeElement).toBe(addButton(element));
    });
    element.remove();
  });

  it('closes the field without saving on a press outside, and focus returns to "+"', async () => {
    const { element, fixture, store } = await setup();
    document.body.append(element);
    const before = store.entities().length;

    addButton(element).click();
    await fixture.whenStable();
    type(element, 'draft');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();

    expect(field(element)).toBeNull();
    expect(store.entities()).toHaveLength(before);
    await until(() => {
      expect(document.activeElement).toBe(addButton(element));
    });
    element.remove();
  });

  it('keeps the field open on a press inside it', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);

    addButton(element).click();
    await fixture.whenStable();
    element
      .querySelector('.tags__hint')
      ?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();

    expect(field(element)).not.toBeNull();
    element.remove();
  });

  it('closes the field when focus moves to another control, which keeps the focus', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);
    const other = document.createElement('button');
    document.body.append(other);

    addButton(element).click();
    await fixture.whenStable();
    other.focus();
    await fixture.whenStable();

    expect(field(element)).toBeNull();
    expect(document.activeElement).toBe(other);
    other.remove();
    element.remove();
  });

  it('"+" closes the open field with one click: it does not close and reopen', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);

    addButton(element).click();
    await fixture.whenStable();
    expect(field(element)).not.toBeNull();

    // A real press: pointerdown (ignored by the outside check), focus change, then click.
    addButton(element).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    addButton(element).focus();
    addButton(element).click();
    await fixture.whenStable();
    expect(field(element)).toBeNull();

    addButton(element).click();
    await fixture.whenStable();
    expect(field(element)).not.toBeNull();
    element.remove();
  });

  it('closes an in-place rename without saving on a press outside', async () => {
    const { element, fixture, store } = await setup();
    document.body.append(element);
    const name = store.entities()[0].name;

    await openMenu(element, name, 'Rename');
    await fixture.whenStable();
    expect(field(element)).not.toBeNull();
    type(element, 'renamed-draft');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();

    expect(field(element)).toBeNull();
    expect(store.entities().map((t) => t.name)).toContain(name);
    element.remove();
  });

  it('creates a tag with the normalized name and closes the field', async () => {
    const { element, store, fixture } = await setup();

    addButton(element).click();
    await fixture.whenStable();
    type(element, '  winter sale ');
    submit(element);

    await until(() => {
      expect(store.entities().some((item) => item.name === 'winter-sale')).toBe(true);
      expect(field(element)).toBeNull();
    });
  });

  it('keeps the field open with a message when the name exists, ignoring case', async () => {
    const { element, fixture } = await setup();

    addButton(element).click();
    await fixture.whenStable();
    type(element, 'DOCS');
    submit(element);

    await until(() => {
      expect(element.textContent).toContain('There’s already a tag'.replace('’', "'"));
    });
    expect(field(element)).not.toBeNull();
  });

  it('refuses an empty name without a request', async () => {
    const { element, fixture } = await setup();

    addButton(element).click();
    await fixture.whenStable();
    type(element, '   ');
    submit(element);

    await until(() => {
      expect(element.textContent).toContain('Enter a tag name');
    });
  });

  it('renames in place from the menu', async () => {
    const { element, store } = await setup();

    await openMenu(element, MOCK_NAME.TagDocs, 'Rename');
    await until(() => {
      expect(field(element)?.value).toBe(MOCK_NAME.TagDocs);
    });
    type(element, 'manuals');
    submit(element);

    await until(() => {
      expect(store.entityMap()[MOCK_ID.TagDocs]?.name).toBe('manuals');
      expect(field(element)).toBeNull();
    });
  });

  it('offers to merge when the new name belongs to another tag', async () => {
    const { element, store } = await setup();

    await openMenu(element, MOCK_NAME.TagDocs, 'Rename');
    await until(() => {
      expect(field(element)).not.toBeNull();
    });
    type(element, 'Recipes');
    submit(element);

    await until(() => {
      expect(element.textContent).toContain('Merge into “recipes”');
    });
    const merge = [...element.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Merge into'),
    );
    merge?.click();

    await until(() => {
      expect(store.entityMap()[MOCK_ID.TagDocs]).toBeUndefined();
    });
  });

  it('navigates with the tag query when a chip is clicked', async () => {
    const { element, router } = await setup();

    chip(element, MOCK_NAME.TagDocs).querySelector<HTMLElement>('.ui-chip__body')?.click();

    await until(() => {
      expect(router.url).toBe('/links?tag=docs');
    });
  });

  it('has no axe violations, with the add field open', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);
    addButton(element).click();
    await fixture.whenStable();

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
