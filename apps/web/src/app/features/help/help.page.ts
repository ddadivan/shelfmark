import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  HighlightComponent,
  IconComponent,
  InputComponent,
  INPUT_TYPE,
} from '@shelfmark/ui';
import { map } from 'rxjs';
import { pluralKey } from '../../core/i18n/plural-key';
import { APP_PATH } from '../../models/app-path.const';
import { HelpHeaderComponent } from './components/help-header/help-header.component';
import { HelpTopicCardComponent } from './components/help-topic-card/help-topic-card.component';
import { HELP_CATEGORIES } from './models/help-categories.const';
import { HELP_CATEGORY } from './models/help-category-id.const';
import { HELP_POPULAR } from './models/help-popular.const';
import { HelpActionsService } from './services/help-actions.service';
import { HelpTextService } from './services/help-text.service';
import { followHelpTitle } from './utils/follow-help-title';
import { helpQueryWords } from './utils/search-help';

/**
 * The Help center (`/help`, Shelf 17-help): the home (search, popular articles, the topics and
 * three ways to more help) and, while the address carries `?q=`, the search results over the
 * articles' titles and texts (client side, in the active language). Public, outside the shell.
 * Ctrl / Cmd K and the header pill focus the search field.
 */
@Component({
  selector: 'app-help-page',
  imports: [
    ButtonComponent,
    HelpHeaderComponent,
    HelpTopicCardComponent,
    HighlightComponent,
    IconComponent,
    InputComponent,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help.page.html',
  styleUrl: './help.page.scss',
})
export default class HelpPage {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly INPUT_TYPE = INPUT_TYPE;
  protected readonly helpPath = `/${APP_PATH.Help}`;
  protected readonly popular = HELP_POPULAR;
  /** The account topic is reached through search, the popular list and the nav of an article. */
  protected readonly topics = HELP_CATEGORIES.filter((c) => c.id !== HELP_CATEGORY.Account);
  protected readonly aboutHref = `/${APP_PATH.About}#works`;
  protected readonly feedbackHref = `/${APP_PATH.Settings}/feedback`;
  protected readonly shortcutsHref = `${this.helpPath}/keyboard-shortcuts`;

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly text = inject(HelpTextService);
  private readonly actions = inject(HelpActionsService);
  private readonly field = viewChild(InputComponent);

  /** `?q=` of the address; null on the home, a string (maybe empty) while searching. */
  private readonly queryParam = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('q'))),
    { initialValue: null },
  );

  protected readonly searching = computed(() => this.queryParam() !== null);
  /** The text in the field: what was typed, and the address when it changes elsewhere. */
  protected readonly query = linkedSignal(() => this.queryParam() ?? '');
  protected readonly words = computed(() => helpQueryWords(this.query()));
  protected readonly results = computed(() => this.text.search(this.query()));
  /** With an empty field the results are every article, in reading order. */
  protected readonly shown = computed(() =>
    this.words().length === 0
      ? this.allArticles()
      : this.results().map((result) => ({ id: result.article.id, snippet: result.snippet })),
  );
  protected readonly countKey = computed(() => pluralKey('help.search.count', this.shown().length));

  constructor() {
    followHelpTitle(computed(() => this.text.translate('help.title')));
  }

  private allArticles(): readonly { readonly id: string; readonly snippet: string }[] {
    return HELP_CATEGORIES.flatMap((category) => category.articles).map((id) => ({
      id,
      snippet: this.text.text(id, 'lead'),
    }));
  }

  protected categoryOf(id: string): string {
    const found = HELP_CATEGORIES.find((category) => category.articles.includes(id));
    return found ? `help.categories.${found.id}.title` : '';
  }

  /** Typing opens the results; the first change adds a history entry, the next ones replace it. */
  protected onQuery(value: string): void {
    this.query.set(value);
    void this.router.navigate([this.helpPath], {
      queryParams: { q: value },
      replaceUrl: this.searching(),
    });
  }

  /** The header pill and Ctrl / Cmd K: show the results view and put the cursor in the field. */
  protected openSearch(): void {
    if (this.searching()) {
      this.focusField();
      return;
    }
    void this.router
      .navigate([this.helpPath], { queryParams: { q: '' } })
      .then(() => this.focusField());
  }

  protected focusField(): void {
    afterNextRender(() => this.field()?.focus(), { injector: this.injector });
  }

  protected howItWorks(event: MouseEvent): void {
    event.preventDefault();
    this.actions.openHowItWorks();
  }

  protected sendFeedback(event: MouseEvent): void {
    event.preventDefault();
    this.actions.sendFeedback();
  }
}
