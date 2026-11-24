import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  LINK_BATCH_ERROR_CODE,
  LINK_ERROR_MESSAGE,
  SUGGESTION_KIND,
} from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../testing/axe';
import { createPopup, createPopupWith, settle, type PopupHarness } from '../testing/create-popup';
import { fakeData, fakePopupDeps } from '../testing/fake-popup-deps';
import {
  makeAiJob,
  makeAiSettings,
  makeFolder,
  makeLink,
  makeRule,
  makeSuggestion,
  makeWindowTab,
} from '../testing/fixtures';
import { SHELFMARK_ORIGIN } from './core/config/shelfmark-origin.const';
import { PopupStore } from './popup/popup.store';

const http = (status: number, message?: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: message === undefined ? null : { message } });

describe('App', () => {
  beforeEach(() => localStorage.clear());

  async function harness(fixture: PopupHarness['fixture']) {
    return TestbedHarnessEnvironment.loader(fixture);
  }

  describe('form', () => {
    it('shows the page and focuses Save after the first render', async () => {
      const { fixture } = await createPopup();
      const loader = await harness(fixture);
      const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save' }));
      expect(await save.isFocused()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('example.com');
      expect(fixture.nativeElement.textContent).toContain('A post');
    });

    it('calls the API with the form when Save is clicked and then shows Saved', async () => {
      const { fixture, api } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        created: makeLink({ folderId: 'f1' }),
      });
      const loader = await harness(fixture);
      TestBed.inject(PopupStore).chooseFolder('f1');
      await settle(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save' }))).click();
      await settle(fixture);
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://www.example.com/post', folderId: 'f1' }),
      );
      expect(fixture.nativeElement.textContent).toContain('Saved to Reading');
    });

    // Known bug: the host binding `(keydown.enter)` of PopupFormComponent never fires for Ctrl or Cmd
    // + Enter (Angular matches the exact modifier set; it needs `keydown.control.enter` and
    // `keydown.meta.enter`). Remove `.fails` when the app code is fixed.
    it('saves with Ctrl+Enter from anywhere in the form', async () => {
      const { fixture, api } = await createPopup();
      const form: HTMLElement = fixture.nativeElement.querySelector('ext-popup-form');
      form.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }),
      );
      await settle(fixture);
      expect(api.create).toHaveBeenCalledTimes(1);
    });

    it('does not save on a plain Enter', async () => {
      const { fixture, api } = await createPopup();
      const form: HTMLElement = fixture.nativeElement.querySelector('ext-popup-form');
      form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle(fixture);
      expect(api.create).not.toHaveBeenCalled();
    });

    it('shows the rule hint and the folder name from a matching rule', async () => {
      const { fixture } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        rules: [makeRule({ folderId: 'f1' })],
      });
      expect(fixture.nativeElement.textContent).toContain('Goes to Reading · rule');
      expect(fixture.nativeElement.textContent).toContain('Reading');
    });

    it('offers recent folders as chips and picks one', async () => {
      localStorage.setItem('sm-ext-recent-folders', JSON.stringify(['f1']));
      const { fixture } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
      });
      const chip: HTMLElement = fixture.nativeElement.querySelector(
        '[role="group"] button, [role="group"] [role="button"]',
      );
      chip.click();
      await settle(fixture);
      expect(TestBed.inject(PopupStore).folderId()).toBe('f1');
    });

    it('names the save shortcut in the footer (Shelf 07-extension: no Open Shelfmark there)', async () => {
      const { fixture } = await createPopup();
      const foot: HTMLElement = fixture.nativeElement.querySelector('.ext-screen__foot');
      expect(foot.textContent).toMatch(/(Ctrl|⌘) Enter to save/);
      expect(foot.textContent).not.toContain('Open Shelfmark');
    });

    it('has no accessibility violations', async () => {
      const { fixture } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
      });
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });
  });

  describe('picker', () => {
    it('emits the chosen folder and goes back to the form', async () => {
      const { fixture } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
      });
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: /Goes to Unsorted/ }))).click();
      await settle(fixture);
      const option = [...fixture.nativeElement.querySelectorAll('[role="option"]')].find(
        (el: Element) => el.textContent?.includes('Reading'),
      ) as HTMLElement;
      option.click();
      await settle(fixture);
      expect(TestBed.inject(PopupStore).folderId()).toBe('f1');
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('ext-popup-picker')).toBeNull();
    });

    it('goes back to the form with the Back button', async () => {
      const { fixture } = await createPopup();
      TestBed.inject(PopupStore).openPicker();
      await settle(fixture);
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ label: 'Back' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
    });

    it('goes back to the form on Escape', async () => {
      const { fixture } = await createPopup();
      TestBed.inject(PopupStore).openPicker();
      await settle(fixture);
      fixture.nativeElement
        .querySelector('ext-popup-picker')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
    });
  });

  describe('new folder', () => {
    async function typeName(fixture: PopupHarness['fixture'], name: string): Promise<void> {
      const input = fixture.nativeElement.querySelector(
        'ext-popup-new-folder input',
      ) as HTMLInputElement;
      input.value = name;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);
    }

    it('names a new folder from the picker; the form shows it as new and Save creates it', async () => {
      const { fixture, api } = await createPopup();
      const loader = await harness(fixture);
      TestBed.inject(PopupStore).openPicker();
      await settle(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'New folder' }))).click();
      await settle(fixture);
      const create = await loader.getHarness(UiButtonHarness.with({ text: 'Create' }));
      expect(await create.isDisabled()).toBe(true);
      await typeName(fixture, 'Clothes');
      await create.click();
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Clothes');
      expect(fixture.nativeElement.textContent).toContain('new');
      expect(api.createFolder).not.toHaveBeenCalled();
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save' }))).click();
      await settle(fixture);
      expect(api.createFolder).toHaveBeenCalledWith({ name: 'Clothes' });
    });

    it('creates on Enter and goes back to the picker on Escape', async () => {
      const { fixture } = await createPopup();
      const store = TestBed.inject(PopupStore);
      store.openNewFolder();
      await settle(fixture);
      const host = fixture.nativeElement.querySelector('ext-popup-new-folder') as HTMLElement;
      host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-picker')).not.toBeNull();
      store.openNewFolder();
      await settle(fixture);
      await typeName(fixture, 'Travel');
      fixture.nativeElement
        .querySelector('ext-popup-new-folder')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle(fixture);
      expect(store.newFolderName()).toBe('Travel');
    });

    it('says on Saved when the folder could not be created', async () => {
      const { fixture, api } = await createPopup();
      api.createFolder.mockRejectedValue(http(409, 'Folder limit reached (500)'));
      TestBed.inject(PopupStore).chooseNewFolder('Clothes');
      await settle(fixture);
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Saved to Unsorted');
      expect(fixture.nativeElement.textContent).toContain(
        'Couldn’t create the folder “Clothes”, so the link is saved without a folder.',
      );
    });
  });

  describe('saved', () => {
    async function saved(): Promise<PopupHarness> {
      const popup = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        created: makeLink({
          folderId: 'f1',
          tags: ['docs'],
          imageUrl: '/api/links/1/image?v=a',
          faviconUrl: '/api/links/1/favicon?v=a',
        }),
      });
      await popup.api.session();
      TestBed.inject(PopupStore).chooseFolder('f1');
      await TestBed.inject(PopupStore).save();
      await settle(popup.fixture);
      return popup;
    }

    it('names the saved link and opens the folder from Open in Shelfmark', async () => {
      const { fixture, tabs } = await saved();
      expect(fixture.nativeElement.textContent).toContain('Saved to Reading');
      expect(fixture.nativeElement.querySelector('ui-illustration')).not.toBeNull();
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Open in Shelfmark' }))).click();
      expect(tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/folders/f1`);
    });

    it('closes the popup with Done and on Escape', async () => {
      const { fixture, tabs } = await saved();
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Done' }))).click();
      fixture.nativeElement
        .querySelector('ext-popup-saved')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(tabs.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('already saved', () => {
    it('shows when it was saved and where, and Save a copy goes back to the form', async () => {
      const { fixture } = await createPopup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        lookup: { link: makeLink({ folderId: 'f1' }) },
      });
      expect(fixture.nativeElement.textContent).toContain('Already in your library');
      expect(fixture.nativeElement.textContent).toContain('in Reading');
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save a copy' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
    });

    it('names Unsorted for a link without a folder and opens it', async () => {
      const { fixture, tabs } = await createPopup({ lookup: { link: makeLink() } });
      expect(fixture.nativeElement.textContent).toContain('in Unsorted');
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Open in Shelfmark' }))).click();
      expect(tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/unsorted`);
    });
  });

  describe('signed out', () => {
    it('opens the sign-in and the privacy policy', async () => {
      const { fixture, tabs } = await createPopup({ session: null });
      const loader = await harness(fixture);
      await (
        await loader.getHarness(UiButtonHarness.with({ text: 'Sign in to Shelfmark' }))
      ).click();
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Privacy policy' }))).click();
      expect(tabs.open.mock.calls.map(([url]) => url)).toEqual([
        `${SHELFMARK_ORIGIN}/sign-in`,
        `${SHELFMARK_ORIGIN}/privacy`,
      ]);
    });

    it('shows the collect scene, the account line and Sign in in the foot', async () => {
      const { fixture } = await createPopup({ session: null });
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('ui-illustration')).not.toBeNull();
      expect(root.textContent).toContain(
        'The extension uses your Shelfmark account in this browser.',
      );
      expect(root.querySelector('.ext-screen__foot')?.textContent).toContain(
        'Sign in to Shelfmark',
      );
    });

    it('has no accessibility violations', async () => {
      const { fixture } = await createPopup({ session: null });
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });
  });

  describe('unsupported page', () => {
    it('explains it and offers no Try again', async () => {
      const { fixture } = await createPopup({ tab: { url: 'chrome://newtab', title: '' } });
      const loader = await harness(fixture);
      expect(fixture.nativeElement.textContent).toContain("This page can't be saved");
      expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Try again' }))).toEqual([]);
      expect(
        await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Open Shelfmark' })),
      ).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('has no accessibility violations', async () => {
      const { fixture } = await createPopup({ tab: null });
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });
  });

  describe('error', () => {
    it('shows the load error with Try again, which loads again', async () => {
      const { fixture, api } = await createPopup();
      api.folders.mockRejectedValueOnce(http(0));
      await TestBed.inject(PopupStore).init();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain("Couldn't reach Shelfmark");
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        'No connection',
      );
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ext-popup-form')).not.toBeNull();
    });

    it('shows the save error with Try again that retries the save', async () => {
      const { fixture, api } = await createPopup();
      api.create.mockRejectedValueOnce(http(500));
      await TestBed.inject(PopupStore).save();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain("Couldn't save this page");
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
      await settle(fixture);
      expect(api.create).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.textContent).toContain('Saved to');
    });

    it('shows no Try again for a full library, only Open Shelfmark', async () => {
      const { fixture, api } = await createPopup();
      api.create.mockRejectedValue(http(403, LINK_ERROR_MESSAGE.LimitReached));
      await TestBed.inject(PopupStore).save();
      await settle(fixture);
      const loader = await harness(fixture);
      expect(fixture.nativeElement.textContent).toContain('Your library is full');
      expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Try again' }))).toEqual([]);
      expect(
        await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Open Shelfmark' })),
      ).toHaveLength(1);
    });
  });

  describe('opening', () => {
    it('shows nothing while loading is fast', async () => {
      const { fixture } = await createPopup();
      TestBed.inject(PopupStore).view.set('opening');
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    });

    it('shows the loading skeleton once loading is slow', async () => {
      const { fixture } = await createPopup();
      const store = TestBed.inject(PopupStore);
      store.view.set('opening');
      store.slow.set(true);
      await settle(fixture);
      expect(
        fixture.nativeElement.querySelector('[role="status"]').getAttribute('aria-label'),
      ).toBe('Loading');
      expect(fixture.nativeElement.textContent).toContain('A post');
    });
  });

  describe('Fill in with AI', () => {
    const ON = makeAiSettings({ settings: { enabled: true } });
    const FILL = { text: 'Fill in with AI' };

    it('shows no AI at all while AI is off', async () => {
      const { fixture, api } = await createPopup();
      const loader = await harness(fixture);
      expect(await loader.getAllHarnesses(UiButtonHarness.with(FILL))).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('ui-ai-line')).toBeNull();
      expect(api.createAiDraft).not.toHaveBeenCalled();
    });

    it('fills the folder and tags on the click and marks them with the spark', async () => {
      const { fixture, api } = await createPopup({
        ai: ON,
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        draft: makeAiJob({
          suggestions: [
            makeSuggestion('s1', SUGGESTION_KIND.Folder, { folderId: 'f1' }),
            makeSuggestion('s2', SUGGESTION_KIND.Tag, { tagName: 'signals' }),
            makeSuggestion('s3', SUGGESTION_KIND.NewTag, { tagName: 'zoneless' }),
          ],
        }),
      });
      const loader = await harness(fixture);
      expect(api.createAiDraft).not.toHaveBeenCalled();
      await (await loader.getHarness(UiButtonHarness.with(FILL))).click();
      await settle(fixture);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Reading');
      expect(text).toContain('signals');
      expect(text).toContain('zoneless');
      // The folder label's spark, and a labelled badge (not a lone spark) on the Tags label line.
      expect(
        fixture.nativeElement.querySelectorAll(
          'ui-icon[title="Generated by AI, may be inaccurate"]',
        ),
      ).toHaveLength(1);
      expect(
        fixture.nativeElement.querySelector('ui-badge[title="Generated by AI, may be inaccurate"]')
          ?.textContent,
      ).toContain('Tags from AI');
      expect(await loader.getAllHarnesses(UiButtonHarness.with(FILL))).toHaveLength(0);
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });

    it('shows the quiet limit line without a toast', async () => {
      const { fixture } = await createPopup({
        ai: ON,
        draft: makeAiJob({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.Quota }),
      });
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with(FILL))).click();
      await settle(fixture);
      const line = fixture.nativeElement.querySelector('ui-ai-line') as HTMLElement;
      expect(line.textContent).toContain('Suggestions are paused until December 1');
      expect(line.textContent).toContain('50');
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });

    it('shows the unavailable line and keeps the button for another try', async () => {
      const { fixture, api } = await createPopup({ ai: ON });
      api.createAiDraft.mockRejectedValueOnce(new Error('500'));
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with(FILL))).click();
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('ui-ai-line').textContent).toContain(
        'aren’t available right now',
      );
      expect(await loader.getAllHarnesses(UiButtonHarness.with(FILL))).toHaveLength(1);
    });

    it('sends the draft id when Save is clicked', async () => {
      const { fixture, api } = await createPopup({ ai: ON });
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with(FILL))).click();
      await settle(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save' }))).click();
      await settle(fixture);
      expect(api.create.mock.calls[0]?.[0].aiDraftId).toBe(
        api.createAiDraft.mock.calls[0]?.[0].draftId,
      );
    });
  });

  describe('all tabs (#569)', () => {
    const ON = makeAiSettings({ settings: { enabled: true } });
    const WINDOW = [
      makeWindowTab(1, 'https://www.example.com/post', { active: true, title: 'A post' }),
      makeWindowTab(2, 'https://b.test/two', { title: 'Second tab' }),
      makeWindowTab(3, 'https://c.test/three', { title: 'Third tab' }),
    ];
    const TABS = {
      windowTabs: WINDOW,
      tabsPermission: true,
      folders: [makeFolder({ id: 'f1', name: 'Reading' }), makeFolder({ id: 'f2', name: 'Tools' })],
      batch: {
        links: WINDOW.map(() => makeLink({ folderId: 'f1' })),
        errors: [],
      },
    };

    const radio = (fixture: PopupHarness['fixture'], index: number): HTMLInputElement =>
      fixture.nativeElement.querySelectorAll('input[type="radio"]')[index];

    async function openTabs(overrides: Parameters<typeof createPopup>[0] = {}) {
      const popup = await createPopup({ ...TABS, ...overrides });
      radio(popup.fixture, 1).click();
      await settle(popup.fixture);
      return popup;
    }

    it('shows the switch with the tab count, only when the window has several savable tabs', async () => {
      const { fixture } = await createPopup(TABS);
      expect(fixture.nativeElement.textContent).toContain('This page');
      expect(fixture.nativeElement.textContent).toContain('All tabs (3)');
    });

    it('hides the switch for a window with one tab', async () => {
      const single = await createPopup({ windowTabs: [WINDOW[0]!], tabsPermission: true });
      expect(single.fixture.nativeElement.querySelector('input[type="radio"]')).toBeNull();
      expect(single.fixture.nativeElement.textContent).toContain('Save to Shelfmark');
    });

    it('swaps the preview for the tab list, hides Note and names the count on Save', async () => {
      const { fixture } = await openTabs();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('3 of 3 selected');
      expect(text).toContain('Second tab');
      expect(text).toContain('b.test');
      expect(text).toContain('Tags for all');
      expect(text).not.toContain('Why are you saving this?');
      expect(fixture.nativeElement.querySelector('.ext-preview')).toBeNull();
      const loader = await harness(fixture);
      expect(await loader.getHarness(UiButtonHarness.with({ text: 'Save 3 links' }))).toBeTruthy();
    });

    it('marks tabs already in the library as Saved and leaves them unticked', async () => {
      const { fixture, api } = await createPopup(TABS);
      api.lookup.mockImplementation((body) =>
        Promise.resolve({ link: body.url.includes('b.test') ? makeLink() : null }),
      );
      radio(fixture, 1).click();
      await settle(fixture);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Saved');
      expect(text).toContain('2 of 3 selected');
      expect(text).toContain('1 already saved');
    });

    it('stays on This page when Chrome’s permission prompt is declined', async () => {
      const { fixture, tabs } = await createPopup({
        ...TABS,
        tabsPermission: false,
        tabsPermissionAnswer: false,
      });
      radio(fixture, 1).click();
      await settle(fixture);
      expect(tabs.requestTabsPermission).toHaveBeenCalledTimes(1);
      expect(fixture.nativeElement.querySelector('ext-popup-tab-list')).toBeNull();
      expect(radio(fixture, 0).checked).toBe(true);
      expect(radio(fixture, 1).checked).toBe(false);
    });

    it('unticks a tab and the count follows', async () => {
      const { fixture } = await openTabs();
      const rows = fixture.nativeElement.querySelectorAll('.tabs__row input[type="checkbox"]');
      (rows[1] as HTMLInputElement).click();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('2 of 3 selected');
      const loader = await harness(fixture);
      expect(await loader.getHarness(UiButtonHarness.with({ text: 'Save 2 links' }))).toBeTruthy();
    });

    it('disables Save with nothing ticked', async () => {
      const { fixture } = await openTabs();
      TestBed.inject(PopupStore).tabList.toggleAll();
      await settle(fixture);
      const loader = await harness(fixture);
      const save = await loader.getHarness(UiButtonHarness.with({ text: 'Save 0 links' }));
      expect(await save.isDisabled()).toBe(true);
    });

    it('sorts with AI and shows each row’s folder, tags and the picked-by-AI field', async () => {
      const { fixture, api } = await openTabs({ ai: ON });
      api.createAiDraft.mockResolvedValue(
        makeAiJob({
          suggestions: [
            makeSuggestion('s0', SUGGESTION_KIND.Folder, { folderId: 'f2' }),
            makeSuggestion('s1', SUGGESTION_KIND.NewTag, { tagName: 'fresh' }),
          ],
        }),
      );
      const loader = await harness(fixture);
      await (
        await loader.getHarness(UiButtonHarness.with({ text: 'Sort 3 links with AI' }))
      ).click();
      await settle(fixture);
      expect(api.createAiDraft).toHaveBeenCalledTimes(3);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Tools');
      expect(text).toContain('fresh');
      expect(text).toContain('Picked by AI for each link');
      expect(
        await loader.getAllHarnesses(UiButtonHarness.with({ text: /Sort 3 links/ })),
      ).toHaveLength(0);
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });

    it('opens the picker with Keep AI picks after sorting, and a folder puts all links in it', async () => {
      const { fixture, api } = await openTabs({ ai: ON });
      api.createAiDraft.mockResolvedValue(
        makeAiJob({
          suggestions: [makeSuggestion('s0', SUGGESTION_KIND.Folder, { folderId: 'f2' })],
        }),
      );
      const loader = await harness(fixture);
      await (
        await loader.getHarness(UiButtonHarness.with({ text: 'Sort 3 links with AI' }))
      ).click();
      await settle(fixture);
      TestBed.inject(PopupStore).openPicker();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Keep AI picks');
      expect(fixture.nativeElement.textContent).toContain('Folder for 3 links');
      expect(fixture.nativeElement.textContent).toContain('Each link keeps the folder AI picked.');
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
      const option = [...fixture.nativeElement.querySelectorAll('[role="option"]')].find(
        (el: Element) => el.textContent?.includes('Reading'),
      ) as HTMLElement;
      option.click();
      await settle(fixture);
      expect(TestBed.inject(PopupStore).tabsAi.picksActive()).toBe(false);
      expect(TestBed.inject(PopupStore).folderId()).toBe('f1');
    });

    it('saves the ticked tabs and shows the saved screen with Close saved tabs', async () => {
      const { fixture, api, tabs } = await openTabs();
      TestBed.inject(PopupStore).chooseFolder('f1');
      await settle(fixture);
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save 3 links' }))).click();
      await settle(fixture);
      expect(api.createBatch).toHaveBeenCalledTimes(1);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('3 links saved to Reading');
      expect(tabs.closeTabs).not.toHaveBeenCalled();
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Close 3 saved tabs' }))).click();
      await settle(fixture);
      expect(tabs.closeTabs).toHaveBeenCalledWith([1, 2, 3]);
      expect(fixture.nativeElement.textContent).toContain('The saved tabs are closed.');
    });

    it('names the skipped tabs with a short reason', async () => {
      const { fixture } = await openTabs({
        batch: {
          links: [makeLink({ folderId: 'f1' }), makeLink({ folderId: 'f1' })],
          errors: [{ index: 1, url: 'https://b.test/two', code: LINK_BATCH_ERROR_CODE.UrlTooLong }],
        },
      });
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save 3 links' }))).click();
      await settle(fixture);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('2 of 3 saved');
      expect(text).toContain('Second tab');
      expect(text).toContain('Address is too long');
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });

    it('shows the error screen with Try again when the batch fails', async () => {
      const { fixture, api } = await openTabs();
      api.createBatch.mockRejectedValueOnce(http(500));
      const loader = await harness(fixture);
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Save 3 links' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Try again');
      await (await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }))).click();
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('3 links saved');
    });

    it('has no accessibility violations in All tabs', async () => {
      const { fixture } = await openTabs({ ai: ON });
      expect(await axeViolations(fixture.nativeElement)).toEqual([]);
    });
  });

  describe('footer', () => {
    it('keeps Open Shelfmark as the secondary button on the screens that offer it', async () => {
      const { fixture } = await createPopup({ tab: { url: 'chrome://newtab', title: '' } });
      const loader = await harness(fixture);
      const open = await loader.getHarness(UiButtonHarness.with({ text: 'Open Shelfmark' }));
      expect(await open.getVariant()).toBe('secondary');
    });

    it('offers only Open Shelfmark while the popup is still loading', async () => {
      const deps = fakePopupDeps(fakeData());
      deps.api.session.mockReturnValue(new Promise(() => undefined));
      const { fixture } = await createPopupWith(deps);
      const buttons = fixture.nativeElement.querySelectorAll('ext-popup-opening ui-button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].textContent).toContain('Open Shelfmark');
    });
  });
});
