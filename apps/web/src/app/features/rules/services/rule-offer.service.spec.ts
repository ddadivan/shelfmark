import { TestBed } from '@angular/core/testing';
import type { RuleOffer, RuleResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import {
  TOAST_CLOSE_REASON,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  type ToastCloseReason,
  type ToastOptions,
} from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { FoldersStore } from '../../../stores/folders.store';
import { RULE_OUTCOME } from '../../../stores/models/rule-outcome.const';
import { RulesStore } from '../../../stores/rules.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { AI_API } from '../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { RULES_API } from '../models/rules-api.const';
import { RuleActionsService } from './rule-actions.service';
import { RuleOfferService } from './rule-offer.service';

type RulesStoreCreate = InstanceType<typeof RulesStore>['create'];

const FOLDER = MOCK_FOLDERS[0];
const OFFER: RuleOffer = { domain: 'youtube.com', folderId: FOLDER?.id ?? '', count: 3 };
const RULE: RuleResponse = {
  id: 'r1',
  domain: 'youtube.com',
  folderId: OFFER.folderId,
  folderAvailable: true,
  tags: [],
  createdAt: '2026-11-17T00:00:00.000Z',
};

/** A toast stand-in whose close the spec decides. */
interface ShownToast {
  options: ToastOptions;
  close: (reason: ToastCloseReason) => void;
}

async function setup(on = true) {
  const shown: ShownToast[] = [];
  const rulesApi = {
    checkOffer: vi.fn(() => of({ offer: OFFER as RuleOffer | null })),
    dismissOffer: vi.fn(() => of(undefined)),
  };
  const create = vi.fn<RulesStoreCreate>(async () => ({ outcome: RULE_OUTCOME.Done, rule: RULE }));
  const actions = {
    describe: () => 'youtube.com: Reading',
    applyToExisting: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: AI_API,
        useValue: fakeAiApi(
          aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: on } }),
        ),
      },
      { provide: RULES_API, useValue: rulesApi },
      { provide: RulesStore, useValue: { create } },
      { provide: RuleActionsService, useValue: actions },
      { provide: FoldersStore, useValue: { entityMap: () => ({ [OFFER.folderId]: FOLDER }) } },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
      {
        provide: ToastService,
        useValue: {
          show: (options: ToastOptions) => {
            let close: (reason: ToastCloseReason) => void = () => undefined;
            const closed = new Promise<ToastCloseReason>((resolve) => (close = resolve));
            shown.push({ options, close });
            return { dismiss: () => close(TOAST_CLOSE_REASON.Dismissed), closed };
          },
        },
      },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  return { shown, rulesApi, create, actions, service: TestBed.inject(RuleOfferService) };
}

/** A filing's Undo toast that closes with `reason` when the spec says so. */
function undoToast() {
  let close: (reason: ToastCloseReason) => void = () => undefined;
  const closed = new Promise<ToastCloseReason>((resolve) => (close = resolve));
  return { ref: { dismiss: () => undefined, closed }, close };
}

describe('RuleOfferService', () => {
  it('offers a rule in a sticky toast; Create rule saves it and offers Apply to Unsorted', async () => {
    const { shown, rulesApi, create, actions, service } = await setup();
    service.afterFiling(['l1', 'l2']);
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    expect(rulesApi.checkOffer).toHaveBeenCalledWith(['l1', 'l2']);
    expect(shown[0]?.options).toEqual(
      expect.objectContaining({
        kind: TOAST_KIND.Moved,
        title: `Always put youtube.com links in ${FOLDER?.name}?`,
        detail: 'Your last 3 links from this site are there. A rule works without AI.',
        duration: TOAST_DURATION_MS.Sticky,
      }),
    );
    shown[0]?.options.action?.run();
    shown[0]?.close(TOAST_CLOSE_REASON.Action);
    await vi.waitFor(() => expect(shown).toHaveLength(2));
    expect(create).toHaveBeenCalledWith({ domain: 'youtube.com', folderId: OFFER.folderId });
    expect(shown[1]?.options.title).toBe('Rule created');
    shown[1]?.options.action?.run();
    expect(actions.applyToExisting).toHaveBeenCalledWith(RULE);
  });

  it('waits for the Undo toast of the filing and asks nothing after Undo', async () => {
    const { shown, rulesApi, service } = await setup();
    const undone = undoToast();
    service.afterFiling(['l1'], undone.ref);
    await Promise.resolve();
    expect(rulesApi.checkOffer).not.toHaveBeenCalled();
    undone.close(TOAST_CLOSE_REASON.Action);
    await new Promise((resolve) => setTimeout(resolve));
    expect(rulesApi.checkOffer).not.toHaveBeenCalled();

    const expired = undoToast();
    service.afterFiling(['l1'], expired.ref);
    expired.close(TOAST_CLOSE_REASON.Timeout);
    await vi.waitFor(() => expect(shown).toHaveLength(1));
  });

  it('remembers Not now and the close button, not a replaced toast', async () => {
    const { shown, rulesApi, service } = await setup();
    service.afterFiling(['l1']);
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    shown[0]?.close(TOAST_CLOSE_REASON.Replaced);
    await new Promise((resolve) => setTimeout(resolve));
    expect(rulesApi.dismissOffer).not.toHaveBeenCalled();

    service.afterFiling(['l1']);
    await vi.waitFor(() => expect(shown).toHaveLength(2));
    shown[1]?.close(TOAST_CLOSE_REASON.Dismissed);
    await vi.waitFor(() => expect(rulesApi.dismissOffer).toHaveBeenCalledWith('youtube.com'));

    // Answered in this session: not offered again.
    service.afterFiling(['l1']);
    await new Promise((resolve) => setTimeout(resolve));
    expect(shown).toHaveLength(2);
    TestBed.inject(SessionScope).end();
  });

  it('asks nothing while AI is off, and stays quiet when the check fails', async () => {
    const off = await setup(false);
    off.service.afterFiling(['l1']);
    expect(off.rulesApi.checkOffer).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const failing = await setup();
    failing.rulesApi.checkOffer.mockReturnValue(throwError(() => new Error('down')));
    failing.service.afterFiling(['l1']);
    await new Promise((resolve) => setTimeout(resolve));
    expect(failing.shown).toHaveLength(0);
  });

  it('says so when the rule cannot be created', async () => {
    const { shown, create, service } = await setup();
    create.mockResolvedValueOnce({ outcome: RULE_OUTCOME.Taken, rule: RULE });
    service.afterFiling(['l1']);
    await vi.waitFor(() => expect(shown).toHaveLength(1));
    shown[0]?.options.action?.run();
    await vi.waitFor(() => expect(shown[1]?.options.title).toBe('Couldn’t create the rule'));
  });
});
