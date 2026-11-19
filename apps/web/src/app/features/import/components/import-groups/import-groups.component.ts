import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  SelectComponent,
  SPINNER_SIZE,
  SpinnerComponent,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { IMPORT_GROUPS_ERROR } from '../../models/import-groups-error.const';
import type { ImportGroupDraft } from '../../models/import-group-draft.interface';
import { ImportFlowService } from '../../services/import-flow.service';
import { ImportGroupsService } from '../../services/import-groups.service';

/** Value of the "Other" choice of a link's select (a select value is a string, never empty). */
const OTHER = 'other';
/** Sample titles shown under a group. */
const SAMPLES = 3;

/**
 * Step 2a of the import dialog: the AI groups as rows with a tick, an editable name (new groups),
 * the number of links, "already there" / "new" and the first titles. A group opens to show its
 * links, each with a select to move it into another group or out to "Other"; the "Other" row has no
 * tick. Nothing is written here; the footer of the dialog starts the import.
 */
@Component({
  selector: 'app-import-groups',
  imports: [
    TranslocoPipe,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    NoticeComponent,
    SelectComponent,
    SpinnerComponent,
  ],
  templateUrl: './import-groups.component.html',
  styleUrl: './import-groups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportGroupsComponent {
  protected readonly flow = inject(ImportFlowService);
  protected readonly state = inject(ImportGroupsService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly SPINNER_SIZE = SPINNER_SIZE;
  protected readonly IMPORT_GROUPS_ERROR = IMPORT_GROUPS_ERROR;
  protected readonly OTHER = OTHER;

  /** Key of the group whose links are open, if any. */
  protected readonly open = signal<string | null>(null);

  protected readonly rows = computed(() => {
    activeLang();
    const links = this.state.links();
    return this.state
      .groups()
      .filter((group) => group.linkIndexes.length > 0 || group.key === this.open())
      .map((group) => ({
        group,
        count: this.plural('import.groups.linkCount', group.linkIndexes.length),
        samples: group.linkIndexes
          .slice(0, SAMPLES)
          .map((index) => links[index]?.title ?? '')
          .join(' · '),
        error: group.included && group.folderId === null && group.name.trim() === '',
      }));
  });

  protected readonly rest = computed(() => {
    activeLang();
    const indexes = this.state.rest();
    return { count: this.plural('import.groups.linkCount', indexes.length) };
  });

  /** The links of the open row (a group, or "Other"); only that row builds its list. */
  protected readonly openLinks = computed(() => {
    const key = this.open();
    if (key === null) return [];
    const indexes =
      key === OTHER
        ? this.state.rest()
        : (this.state.groups().find((group) => group.key === key)?.linkIndexes ?? []);
    return this.linkViews(indexes);
  });

  protected readonly heading = computed(() => {
    const groups = this.plural('import.groups.count', this.state.groupCount());
    const links = this.plural('import.groups.forLinks', this.state.linkCount());
    return `${groups} ${links}`;
  });

  protected readonly waiting = computed(() =>
    this.plural('import.groups.waiting', this.state.linkCount()),
  );

  /** Where a link can go: every group (named as typed) and "Other". */
  protected readonly targets = computed<SelectOption[]>(() => {
    activeLang();
    return [
      ...this.state
        .groups()
        .map((group) => ({ id: group.key, name: group.name.trim() || group.key })),
      { id: OTHER, name: this.transloco.translate('import.groups.other') },
    ];
  });

  protected toggleOpen(key: string): void {
    this.open.update((current) => (current === key ? null : key));
  }

  protected rename(group: ImportGroupDraft, name: string): void {
    this.state.rename(group.key, name);
  }

  protected move(index: number, to: string | null): void {
    this.state.move(index, to === OTHER ? null : to);
  }

  protected placeOf(index: number): string {
    return this.state.placeOf(index) ?? OTHER;
  }

  private linkViews(indexes: readonly number[]) {
    const links = this.state.links();
    return indexes.map((index) => ({
      index,
      title: links[index]?.title ?? '',
      url: links[index]?.url ?? '',
    }));
  }

  private plural(base: string, count: number): string {
    return this.transloco.translate(pluralKey(base, count), {
      count: this.locale.formatNumber(count),
    });
  }
}
