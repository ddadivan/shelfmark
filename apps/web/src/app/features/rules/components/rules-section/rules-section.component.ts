import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RULE_LIMIT, type RuleResponse } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
  FaviconComponent,
  FolderIconComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  NOTICE_KIND,
  NoticeComponent,
  SettingsSectionComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  TooltipDirective,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../../stores/folders.store';
import { RulesStore } from '../../../../stores/rules.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { RuleActionsService } from '../../services/rule-actions.service';
import { ruleRows } from '../../utils/rule-rows';

/**
 * Settings › Library › Rules (#398): the domain rules with their folder and tags, "Add rule", and
 * per rule Edit, "Apply to existing links" and Delete (with Undo). The flows live in
 * `RuleActionsService`.
 */
@Component({
  selector: 'app-rules-section',
  imports: [
    SkeletonComponent,
    ButtonComponent,
    IconComponent,
    FaviconComponent,
    FolderIconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    NoticeComponent,
    SettingsSectionComponent,
    TooltipDirective,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules-section.component.html',
  styleUrl: './rules-section.component.scss',
})
export class RulesSectionComponent {
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly RULE_LIMIT = RULE_LIMIT;
  protected readonly ICON_SIZE = ICON_SIZE;

  protected readonly store = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  protected readonly actions = inject(RuleActionsService);

  protected readonly rows = computed(() =>
    ruleRows(this.store.items(), this.folders.entityMap(), (colour) =>
      this.settings.shownColour(colour),
    ),
  );

  constructor() {
    void this.store.load();
    void this.folders.load();
  }

  protected add(): void {
    void this.actions.create();
  }

  protected edit(rule: RuleResponse): void {
    void this.actions.edit(rule);
  }

  protected apply(rule: RuleResponse): void {
    void this.actions.applyToExisting(rule);
  }

  protected retry(): void {
    void this.store.load();
  }
}
