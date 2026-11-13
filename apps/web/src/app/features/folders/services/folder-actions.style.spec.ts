import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter } from '@angular/router';
import {
  FOLDER_COLOUR,
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_ICON,
} from '@shelfmark/contracts';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { UiChoiceGridHarness, UiColorPickerHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { FoldersStore } from '../../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockUserSettingsApi } from '../../settings/mock/mock-user-settings.api';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import { FolderActionsService } from './folder-actions.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RootComponent {}

function overlayLoader() {
  return TestbedHarnessEnvironment.documentRootLoader(TestBed.createComponent(RootComponent));
}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: USER_SETTINGS_API, useClass: MockUserSettingsApi },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(FoldersStore);
  await store.load();
  return { store, actions: TestBed.inject(FolderActionsService) };
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
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

async function opened(): Promise<HTMLElement> {
  await until(() => {
    expect(dialog()).not.toBeNull();
  });
  return dialog() as HTMLElement;
}

async function closed(): Promise<void> {
  await until(() => {
    expect(dialog()).toBeNull();
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...(dialog()?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button ${label}`);
  }
  return found;
}

function radio(group: string, name: string): HTMLInputElement {
  const found = dialog()?.querySelector<HTMLInputElement>(
    `[role="radiogroup"][aria-labelledby="folder-style-${group}"] input[aria-label="${name}"]`,
  );
  if (!found) {
    throw new Error(`no ${group} ${name}`);
  }
  return found;
}

afterEach(() => {
  document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
    node.remove();
  });
});

describe('FolderActionsService style', () => {
  it('shows the folder, the eight colours and the icons as named radios, current ones checked', async () => {
    const { actions, store } = await setup();
    const folder = store.entityMap()[MOCK_ID.FolderReading];

    void actions.style(folder);
    const root = await opened();

    expect(root.querySelector('h2')?.textContent).toBe(MOCK_NAME.FolderReading);
    expect(root.textContent).toContain('links');
    const colours = [...root.querySelectorAll('[aria-labelledby="folder-style-colour"] input')].map(
      (input) => input.getAttribute('aria-label'),
    );
    expect(colours).toEqual(['Graphite', 'Sage', 'Ocean', 'Plum', 'Clay', 'Amber', 'Rose', 'Teal']);
    expect(radio('colour', 'Graphite').checked).toBe(true);
    expect(radio('icon', 'Folder').checked).toBe(true);
    expect(root.querySelectorAll('[aria-labelledby="folder-style-icon"] input')).toHaveLength(
      Object.values(FOLDER_ICON).length,
    );
    button('Cancel').click();
    await closed();
  });

  it('saves the chosen colour and icon at once', async () => {
    const { actions, store } = await setup();

    const done = actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    await opened();
    radio('colour', 'Clay').click();
    radio('icon', 'Star').click();
    TestBed.tick();
    button('Save').click();
    await closed();
    await done;

    expect(store.entityMap()[MOCK_ID.FolderReading]).toMatchObject({
      colour: 'clay',
      icon: 'star',
    });
  });

  it('Reset goes back to the graphite folder', async () => {
    const { actions, store } = await setup();
    await store.setStyle(MOCK_ID.FolderReading, {
      colour: FOLDER_COLOUR.Rose,
      icon: 'star',
    });

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    await opened();
    expect(radio('colour', 'Rose').checked).toBe(true);
    button('Reset').click();
    TestBed.tick();
    button('Save').click();
    await closed();

    await until(() => {
      expect(store.entityMap()[MOCK_ID.FolderReading]).toMatchObject({
        colour: FOLDER_DEFAULT_COLOUR,
        icon: FOLDER_DEFAULT_ICON,
      });
    });
  });

  it('shows 28 common icons, a toggle opens all of them, and opens expanded for a later icon (#335)', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    const toggle = () =>
      [...root.querySelectorAll('button')].find((candidate) =>
        /^Show (all icons|fewer)/.test(candidate.textContent?.trim() ?? ''),
      ) as HTMLButtonElement;
    const more = root.querySelector('.folder-style__more') as HTMLElement;
    const total = Object.values(FOLDER_ICON).length;

    expect(root.querySelectorAll('.folder-style__more input')).toHaveLength(total - 28);
    expect(root.querySelectorAll('[aria-labelledby="folder-style-icon"] input')).toHaveLength(
      total,
    );
    expect(toggle().textContent?.trim()).toBe(`Show all icons (${total})`);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe(more.id);
    expect(more.classList).not.toContain('is-open');

    toggle().click();
    TestBed.tick();
    expect(toggle().textContent?.trim()).toBe('Show fewer');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(more.classList).toContain('is-open');
    button('Cancel').click();
    await closed();

    // An icon behind the toggle: the dialog opens expanded.
    await store.setStyle(MOCK_ID.FolderReading, { icon: FOLDER_ICON.Trophy });
    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const again = await opened();
    expect(again.querySelector('.folder-style__more')?.classList).toContain('is-open');
    expect(radio('icon', 'Trophy').checked).toBe(true);
    button('Cancel').click();
    await closed();
  });

  it('adds an own color from the "+" swatch, keeps it as a swatch and saves it (#335)', async () => {
    const { actions, store } = await setup();
    const settings = TestBed.inject(UserSettingsStore);

    const done = actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    // The eight built-in swatches are one line; the "+" swatch is the picker's.
    expect(root.querySelector('.ui-choice-grid--single-line')).not.toBeNull();
    (root.querySelector('.ui-color-picker__swatch') as HTMLButtonElement).click();
    await until(() => {
      expect(root.querySelector('.ui-color-picker__hex-input')).not.toBeNull();
    });
    const hex = root.querySelector('.ui-color-picker__hex-input') as HTMLInputElement;
    hex.value = '#3A7BD5';
    hex.dispatchEvent(new Event('input'));
    // Typing only previews; "Add color" is the explicit choice (#350).
    (
      root.querySelector(
        '.ui-color-picker__actions .ui-button--primary, .ui-color-picker__actions ui-button:last-child button',
      ) as HTMLButtonElement
    ).click();
    await until(() => {
      expect(settings.customColours()).toEqual(['#3a7bd5']);
      expect(root.querySelector('input[aria-label="Your color #3a7bd5"]')).not.toBeNull();
    });
    expect(
      (root.querySelector('input[aria-label="Your color #3a7bd5"]') as HTMLInputElement).checked,
    ).toBe(true);
    button('Save').click();
    await closed();
    await done;

    expect(store.entityMap()[MOCK_ID.FolderReading].colour).toBe('#3a7bd5');
  });

  it('a typed hex code only previews; "Add color" keeps and chooses it and closes the picker (#350)', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    const picker = await overlayLoader().getHarness(
      UiColorPickerHarness.with({ label: 'Add your own color' }),
    );
    await picker.open();
    await picker.setHex('#3a7bd5');
    await picker.confirmHex();

    expect(root.querySelector('input[aria-label="Your color #3a7bd5"]')).toBeNull();
    await picker.add();
    await until(() => {
      expect(
        (root.querySelector('input[aria-label="Your color #3a7bd5"]') as HTMLInputElement | null)
          ?.checked,
      ).toBe(true);
    });
    expect(await picker.isOpen()).toBe(false);
    button('Cancel').click();
    await closed();
  });

  it('Delete on an own swatch forgets it with an Undo toast; the worn colour stays chosen (#350)', async () => {
    const { actions, store } = await setup();
    const settings = TestBed.inject(UserSettingsStore);
    await settings.load();
    await settings.addCustomColour('#3a7bd5');
    await settings.addCustomColour('#1d4f91');
    await store.setStyle(MOCK_ID.FolderReading, { colour: '#1d4f91' });
    const show = vi.spyOn(TestBed.inject(ToastService), 'show').mockReturnValue({
      dismiss: vi.fn(),
      closed: new Promise(() => undefined),
    } as unknown as ReturnType<ToastService['show']>);

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    await opened();
    const own = await overlayLoader().getHarness(
      UiChoiceGridHarness.with({ label: 'Your own colors' }),
    );
    const [first] = await own.getChoices({ label: 'Your color #3a7bd5' });
    await first.removeWithKeyboard();

    await until(() => {
      expect(settings.customColours()).toEqual(['#1d4f91']);
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Color removed',
          action: expect.objectContaining({ label: 'Undo' }),
        }),
      );
    });
    expect(await own.getLabels()).toEqual(['Your color #1d4f91']);
    expect(await (await own.getSelected())?.getLabel()).toBe('Your color #1d4f91');
    button('Cancel').click();
    await closed();
  });

  it('gives the colours one radio name and every icon, shown or behind the toggle, another', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    const names = (group: string) =>
      new Set(
        [...root.querySelectorAll(`[aria-labelledby="folder-style-${group}"] input`)].map((input) =>
          input.getAttribute('name'),
        ),
      );

    // One name per group: the browser's arrow keys run through all of its radios.
    expect(names('colour').size).toBe(1);
    expect([...names('icon')]).toEqual(['folder-style-icon']);
    button('Cancel').click();
    await closed();
  });

  it('takes exactly one emoji as the icon and refuses anything else (#335)', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    const field = root.querySelector('.folder-style__emoji input') as HTMLInputElement;

    field.value = 'pizza';
    field.dispatchEvent(new Event('input'));
    button('Save').click();
    await until(() => {
      expect(root.textContent).toContain('Enter exactly one emoji');
    });
    expect(dialog()).not.toBeNull();

    field.value = '🍕';
    field.dispatchEvent(new Event('input'));
    TestBed.tick();
    expect(root.querySelector('.ui-folder-icon__emoji')?.textContent).toBe('🍕');
    button('Save').click();
    await closed();

    expect(store.entityMap()[MOCK_ID.FolderReading].icon).toBe('🍕');
  });

  it('changes nothing on Cancel', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    await opened();
    radio('colour', 'Teal').click();
    button('Cancel').click();
    await closed();

    expect(store.entityMap()[MOCK_ID.FolderReading].colour).toBe(FOLDER_DEFAULT_COLOUR);
  });

  it('has no axe violations', async () => {
    const { actions, store } = await setup();

    void actions.style(store.entityMap()[MOCK_ID.FolderReading]);
    const root = await opened();
    const result = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(result.violations.map((violation) => violation.id)).toEqual([]);
    button('Cancel').click();
    await closed();
  });
});
