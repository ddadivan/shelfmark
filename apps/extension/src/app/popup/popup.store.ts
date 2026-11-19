import { computed, inject, Service, signal } from '@angular/core';
import {
  findMatchingRule,
  FOLDER_LIMIT,
  LINK_LIMIT,
  type FolderResponse,
  type LinkLookupResponse,
  type LinkResponse,
  type RuleResponse,
  type TagResponse,
} from '@shelfmark/contracts';
import { ShelfmarkApiService } from '../core/api/shelfmark-api.service';
import { BrowserTabsService } from '../core/chrome/browser-tabs.service';
import { APP_PATH } from '../core/config/models/app-path.const';
import { SHELFMARK_ORIGIN } from '../core/config/shelfmark-origin.const';
import { OPENING_DELAY_MS } from './models/opening-delay-ms.const';
import type { PageInfo } from './models/page-info.interface';
import type { PopupFailure } from './models/popup-failure.interface';
import { POPUP_STEP } from './models/popup-step.const';
import { POPUP_VIEW } from './models/popup-view.const';
import type { PopupView } from './models/popup-view.type';
import { PopupAiFillService } from './services/popup-ai-fill.service';
import { readRecentFolders, rememberRecentFolder } from './utils/recent-folders';
import { toFolderOptions } from './utils/to-folder-options';
import { toPageInfo } from './utils/to-page-info';
import { toPopupFailure } from './utils/to-popup-failure';
import { withoutFragment } from './utils/without-fragment';

/**
 * The popup's one flow (#445): read the tab, ask the API whether the user is signed in and whether
 * the URL is saved already, then show the prefilled form; Save creates the link, closing the popup
 * creates nothing. Only the tab's URL and title (plus what the user picks) are ever sent.
 */
@Service()
export class PopupStore {
  private readonly api = inject(ShelfmarkApiService);
  private readonly tabs = inject(BrowserTabsService);
  /** "Fill in with AI": starts only on the user's click (see its own doc). */
  readonly ai = inject(PopupAiFillService);

  readonly view = signal<PopupView>(POPUP_VIEW.Opening);
  /** The opening skeleton shows only once loading has taken longer than `OPENING_DELAY_MS`. */
  readonly slow = signal(false);
  readonly page = signal<PageInfo | null>(null);
  readonly folders = signal<readonly FolderResponse[]>([]);
  readonly tags = signal<readonly TagResponse[]>([]);
  readonly failure = signal<PopupFailure | null>(null);
  /** The saved link (Saved) or the existing one (Already saved). */
  readonly link = signal<LinkResponse | null>(null);
  readonly saving = signal(false);

  readonly folderId = signal<string | null>(null);
  /** A folder the user named in the popup: created only on Save, so closing leaves no empty folder. */
  readonly newFolderName = signal<string | null>(null);
  /** Save could not create `newFolderName`: the link went to Unsorted and Saved says so. */
  readonly folderNotCreated = signal<string | null>(null);
  readonly chosenTags = signal<string[]>([]);
  readonly note = signal('');

  constructor() {
    this.ai.attach({
      folders: this.folders,
      folderId: this.folderId,
      newFolderName: this.newFolderName,
      chosenTags: this.chosenTags,
      note: this.note,
    });
  }

  private readonly recentIds = signal(readRecentFolders());
  private readonly rule = signal<Pick<RuleResponse, 'domain' | 'folderId'> | null>(null);
  private idempotencyKey = crypto.randomUUID();

  readonly folderOptions = computed(() => toFolderOptions(this.folders()));
  /** The chosen folder, `null` for Unsorted. */
  readonly folder = computed(() => this.findFolder(this.folderId()));
  /** "From your rule for cos.com" while the folder is still the one a domain rule picked. */
  readonly ruleHint = computed(() => {
    const rule = this.rule();
    return rule !== null && rule.folderId !== null && rule.folderId === this.folderId()
      ? rule.domain
      : null;
  });
  /** Up to three folders saved to most recently that still exist (`null` is Unsorted). */
  readonly recentFolders = computed(() =>
    this.recentIds()
      .filter((id) => id === null || this.findFolder(id) !== null)
      .map((id) => ({ id, folder: this.findFolder(id) })),
  );
  /** The folder of the saved or existing link, `null` for Unsorted. */
  readonly linkFolder = computed(() => this.findFolder(this.link()?.folderId ?? null));

  async init(): Promise<void> {
    // A tab closed while the popup opens leaves nothing to save: the same screen as a browser page.
    const tab = await this.tabs.active().catch(() => null);
    const page = toPageInfo(tab);
    this.page.set(page);
    if (page === null) {
      this.view.set(POPUP_VIEW.Unsupported);
      return;
    }
    await this.load(page);
  }

  async save(): Promise<void> {
    const page = this.page();
    if (page === null || this.saving()) return;
    this.saving.set(true);
    this.failure.set(null);
    try {
      if (!(await this.createNewFolder())) return;
      const note = this.note().trim();
      const folderId = this.folderId();
      const aiDraftId = this.ai.draftId();
      // Without a usable tab title (only "YouTube" while a video loads) the server reads the page's.
      const title = this.ai.cleanTitle() ?? (page.titleFromTab ? page.title : null);
      const link = await this.api.create({
        url: page.url,
        ...(title !== null && { title: title.slice(0, LINK_LIMIT.TitleMax) }),
        ...(folderId !== null && { folderId }),
        tags: this.chosenTags(),
        ...(note !== '' && { note }),
        idempotencyKey: this.idempotencyKey,
        ...(aiDraftId !== null && { aiDraftId }),
        // The form already shows what a domain rule filled in; it sends exactly that.
        applyRules: false,
      });
      rememberRecentFolder(link.folderId);
      this.recentIds.set(readRecentFolders());
      this.link.set(link);
      this.view.set(POPUP_VIEW.Saved);
    } catch (error: unknown) {
      this.fail(error, POPUP_STEP.Save);
    } finally {
      this.saving.set(false);
    }
  }

  /** The "Fill in with AI" button: only now does the page address go to Shelfmark for AI. */
  async fillWithAi(): Promise<void> {
    const page = this.page();
    if (page !== null) await this.ai.fill(page);
  }

  /** Already saved → a second copy through the form, with a fresh idempotency key. */
  saveCopy(): void {
    this.idempotencyKey = crypto.randomUUID();
    this.view.set(POPUP_VIEW.Form);
  }

  async retry(): Promise<void> {
    const failure = this.failure();
    const page = this.page();
    if (failure === null || page === null) return;
    if (failure.step === POPUP_STEP.Save) {
      this.view.set(POPUP_VIEW.Form);
      await this.save();
    } else {
      this.view.set(POPUP_VIEW.Opening);
      await this.load(page);
    }
  }

  openPicker(): void {
    this.view.set(POPUP_VIEW.Picker);
  }

  closePicker(): void {
    this.view.set(POPUP_VIEW.Form);
  }

  chooseFolder(id: string | null): void {
    this.folderId.set(id);
    this.newFolderName.set(null);
    this.view.set(POPUP_VIEW.Form);
  }

  openNewFolder(): void {
    this.view.set(POPUP_VIEW.NewFolder);
  }

  /**
   * A new folder for this link, created on Save. A folder of that name (ignoring case) that exists
   * already is chosen instead, so nothing is duplicated.
   */
  chooseNewFolder(name: string): void {
    const trimmed = name.trim().slice(0, FOLDER_LIMIT.NameMax);
    if (trimmed === '') return;
    const existing = this.folders().find(
      (folder) => folder.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );
    if (existing !== undefined) {
      this.chooseFolder(existing.id);
      return;
    }
    this.folderId.set(null);
    this.newFolderName.set(trimmed);
    this.view.set(POPUP_VIEW.Form);
  }

  openApp(): Promise<void> {
    return this.tabs.open(`${SHELFMARK_ORIGIN}${APP_PATH.Links}`);
  }

  /** The folder page of the saved or existing link. */
  openLinkFolder(): Promise<void> {
    const id = this.link()?.folderId ?? null;
    const path = id === null ? APP_PATH.Unsorted : `${APP_PATH.Folders}/${encodeURIComponent(id)}`;
    return this.tabs.open(`${SHELFMARK_ORIGIN}${path}`);
  }

  openSignIn(): Promise<void> {
    return this.tabs.open(`${SHELFMARK_ORIGIN}${APP_PATH.SignIn}`);
  }

  openAiSettings(): Promise<void> {
    return this.tabs.open(`${SHELFMARK_ORIGIN}${APP_PATH.AiSettings}`);
  }

  openPrivacy(): Promise<void> {
    return this.tabs.open(`${SHELFMARK_ORIGIN}${APP_PATH.Privacy}`);
  }

  close(): void {
    this.tabs.close();
  }

  private async load(page: PageInfo): Promise<void> {
    this.slow.set(false);
    const timer = setTimeout(() => this.slow.set(true), OPENING_DELAY_MS);
    try {
      const session = await this.api.session();
      if (session === null) {
        this.view.set(POPUP_VIEW.SignedOut);
        return;
      }
      const [folders, tags, rules, lookup] = await Promise.all([
        this.api.folders(),
        this.api.tags(),
        this.api.rules(),
        this.lookup(page.url),
        this.ai.load(),
      ]);
      this.folders.set(folders.items);
      this.tags.set(tags.items);
      this.prefill(page, rules.items);
      this.link.set(lookup.link);
      this.view.set(lookup.link === null ? POPUP_VIEW.Form : POPUP_VIEW.Duplicate);
    } catch (error: unknown) {
      this.fail(error, POPUP_STEP.Load);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Creates the folder the user named, if any, right before the link is saved. When that fails (the
   * folder limit, a server error) the link is still saved, without a folder, and Saved tells the user;
   * only a 401 stops the save (signed out). Answers whether the save goes on.
   */
  private async createNewFolder(): Promise<boolean> {
    const name = this.newFolderName();
    if (name === null) return true;
    try {
      const folder = await this.api.createFolder({ name });
      this.folders.update((folders) => [...folders, folder]);
      this.folderId.set(folder.id);
    } catch (error: unknown) {
      if (toPopupFailure(error, POPUP_STEP.Save) === 'signedOut') {
        this.view.set(POPUP_VIEW.SignedOut);
        return false;
      }
      this.folderNotCreated.set(name);
      this.folderId.set(null);
    }
    // Created or given up: a retry of the link save must not create it again.
    this.newFolderName.set(null);
    return true;
  }

  /**
   * The duplicate check: the address only, without the #fragment (the server ignores it). It never
   * blocks saving: any failure but a 401 (signed out) falls back to the plain form, so a 404 from an
   * older API or a 429 still leaves Save working.
   */
  private async lookup(url: string): Promise<LinkLookupResponse> {
    try {
      return await this.api.lookup({ url: withoutFragment(url) });
    } catch (error: unknown) {
      if (toPopupFailure(error, POPUP_STEP.Load) === 'signedOut') throw error;
      return { link: null };
    }
  }

  /** The form as a domain rule would fill it (#398): its folder while that folder is live, its tags. */
  private prefill(page: PageInfo, rules: readonly RuleResponse[]): void {
    const rule = findMatchingRule(rules, page.url);
    const folderId = rule?.folderAvailable === true ? rule.folderId : null;
    this.rule.set(rule === null ? null : { domain: rule.domain, folderId });
    this.folderId.set(folderId);
    this.chosenTags.set(rule === null ? [] : [...rule.tags]);
  }

  private fail(error: unknown, step: PopupFailure['step']): void {
    const failure = toPopupFailure(error, step);
    if (failure === 'signedOut') {
      this.view.set(POPUP_VIEW.SignedOut);
      return;
    }
    this.failure.set(failure);
    this.view.set(POPUP_VIEW.Error);
  }

  private findFolder(id: string | null): FolderResponse | null {
    return id === null ? null : (this.folders().find((folder) => folder.id === id) ?? null);
  }
}
