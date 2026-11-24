import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ASK_PERIOD } from '@shelfmark/contracts';
import {
  type AskStarterGroup,
  AskStartersComponent,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
  NoticeComponent,
  ReducedMotion,
  UiDialogRef,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { APP_PATH } from '../../../../models/app-path.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { SEARCH_QUERY_PARAM } from '../../../links/models/search-query-param.const';
import { SearchDialogService } from '../../../search/services/search-dialog.service';
import type { AskLine } from '../../models/ask-line.interface';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskInbox } from '../../services/ask-inbox.service';
import { AskStore } from '../../services/ask.store';
import { aiResetDate } from '../../utils/ai-reset-date';
import { askStarterGroups } from '../../utils/ask-starter-groups';
import { AskEntryComponent } from '../ask-entry/ask-entry.component';

/**
 * The Ask conversation (Shelf 11-ask). Before the first question, in the panel: the 48px spark
 * tile, "Ask your shelf", the lead with the link count and the four "what it can do" cards
 * (`ui-ask-starters`); on the phone page (`onPage`) the 40px tile, the short lead and one pill per
 * card. With no questions left, the limit row with "Open search" stands in for the examples. Then
 * the questions with their answers. A question handed over (`AskInbox`, from ⌘K or the phone
 * search) is asked as soon as it shows, or dropped while another question streams; the inbox is
 * cleared when the panel closes. Each new question scrolls the chat (the panel body or the page)
 * so it shows at the top, with its answer coming in below. "Search", "Open search" and "Add a
 * link" close the surrounding panel first. Uses the panel's `AskStore`.
 */
@Component({
  selector: 'app-ask-conversation',
  imports: [
    NgTemplateOutlet,
    TranslocoPipe,
    AskStartersComponent,
    ButtonComponent,
    IconComponent,
    NoticeComponent,
    AskEntryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-conversation.component.html',
  styleUrl: './ask-conversation.component.scss',
})
export class AskConversationComponent {
  /** The phone page: the compact start (its `h1` is the page's). */
  readonly onPage = input(false, { transform: booleanAttribute });

  protected readonly store = inject(AskStore);
  private readonly settings = inject(AiSettingsStore);
  private readonly folders = inject(FoldersStore);
  private readonly inbox = inject(AskInbox);
  private readonly router = inject(Router);
  private readonly links = inject(LinkActionsService);
  private readonly searchDialog = inject(SearchDialogService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly ref = inject(UiDialogRef, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly motion = inject(ReducedMotion);
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The "what it can do" cards, translated (re-built on a language switch). */
  protected readonly groups = computed((): AskStarterGroup[] => {
    activeLang();
    return askStarterGroups(this.folders.entities()).map((group) => ({
      title: this.transloco.translate(group.titleKey),
      icon: group.icon,
      questions: group.questions.map((question) =>
        this.transloco.translate(question.key, { folder: question.folder }),
      ),
    }));
  });
  private readonly linkCount = computed(() => this.folders.counts().all);
  protected readonly startLead = computed(() => ({
    key: pluralKey('ai.ask.startLead', this.linkCount()),
    params: { count: this.linkCount() },
  }));
  protected readonly startShort = computed(() => ({
    key: pluralKey('ai.ask.startShort', this.linkCount()),
    params: { count: this.linkCount() },
  }));
  /** No questions left in the day or month: the limit row replaces the examples. */
  protected readonly limited = computed(() => this.settings.askAllowance()?.questionsLeft === 0);
  protected readonly limitLine = computed((): AskLine | null => {
    const allowance = this.settings.askAllowance();
    if (allowance === null) {
      return null;
    }
    const date = aiResetDate(allowance.resetsOn);
    return {
      key: allowance.period === ASK_PERIOD.Day ? 'ai.ask.limit.day' : 'ai.ask.limit.month',
      params: { date: date === null ? '' : this.locale.formatDate(date) },
    };
  });

  constructor() {
    void this.folders.load();
    effect(() => {
      if (this.inbox.pending() !== null) {
        untracked(() => {
          // Taken even while another question streams: a refused question is dropped, never asked
          // later unprompted (it would spend a question).
          const question = this.inbox.take();
          if (question !== null) {
            this.store.ask(question);
          }
        });
      }
    });
    let count = this.store.entries().length;
    effect(() => {
      const next = this.store.entries().length;
      if (next > count) {
        this.userScrolled = false;
        afterNextRender(() => this.revealLatest(), { injector: this.injector });
      }
      count = next;
    });
    // When a question is sent its answer is still empty, so the chat may not scroll far enough to
    // bring the question to the top (a short chat, a tall window). Once the answer is in, reveal it
    // again, unless the person scrolled meanwhile.
    let streaming = this.store.streaming();
    effect(() => {
      const now = this.store.streaming();
      if (streaming && !now && !this.userScrolled) {
        afterNextRender(() => this.revealLatest(), { injector: this.injector });
      }
      streaming = now;
    });
    const scrolled = (): void => {
      this.userScrolled = true;
    };
    const root = this.host.nativeElement.ownerDocument;
    for (const type of ['wheel', 'touchmove', 'keydown']) {
      root.addEventListener(type, scrolled, { passive: true });
    }
    inject(DestroyRef).onDestroy(() => {
      this.inbox.clear();
      for (const type of ['wheel', 'touchmove', 'keydown']) {
        root.removeEventListener(type, scrolled);
      }
    });
  }

  /** The person scrolled (or used the keyboard) since the newest question was sent. */
  private userScrolled = false;

  /** Scrolls the newest question to the top of whatever scrolls the chat. */
  private revealLatest(): void {
    const latest = [...this.host.nativeElement.querySelectorAll('app-ask-entry')].at(-1);
    if (typeof latest?.scrollIntoView !== 'function') return;
    latest.scrollIntoView({ block: 'start', behavior: this.motion.reduced() ? 'auto' : 'smooth' });
  }

  protected async search(query: string): Promise<void> {
    this.ref?.close();
    await this.router.navigate([`/${APP_PATH.Links}`], {
      queryParams: { [SEARCH_QUERY_PARAM]: query },
    });
  }

  /** "Open search" on the limit row: the search starts once the panel is gone. */
  protected openSearch(): void {
    if (this.ref) {
      this.ref.afterClosed().subscribe(() => this.searchDialog.open());
      this.ref.close();
      return;
    }
    this.searchDialog.open();
  }

  protected add(): void {
    this.ref?.close();
    void this.links.addLink();
  }
}
