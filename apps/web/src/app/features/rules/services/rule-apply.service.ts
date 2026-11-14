import { inject, Injector, Service } from '@angular/core';
import type { LinkResponse, RuleMatch, RuleResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { ruleUndoGroups } from '../utils/rule-undo-groups';

/**
 * "Apply to existing links" (#398): files the matched links of Unsorted with the existing bulk
 * update (folder and tags in one call) and undoes it the same way, taking off only the tags each
 * link did not have before. The feed and the counts follow both.
 */
@Service()
export class RuleApplyService {
  // Resolved on use: specs that never apply a rule provide no `LINKS_API`.
  private readonly injector = inject(Injector);
  private readonly links = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly views = inject(SavedViewsStore);

  /** The live target folder of the rule, or `null` (none, or in Trash). */
  folderOf(rule: RuleResponse): string | null {
    return rule.folderAvailable ? rule.folderId : null;
  }

  /** Moves and tags the matched links; resolves false when the request fails (nothing changed). */
  async apply(rule: RuleResponse, matches: readonly RuleMatch[]): Promise<boolean> {
    const folderId = this.folderOf(rule);
    try {
      const response = await firstValueFrom(
        this.api().updateBatch({
          ids: matches.map((match) => match.id),
          ...(folderId !== null && { folderId }),
          ...(rule.tags.length > 0 && { addTags: [...rule.tags] }),
        }),
      );
      this.after(response.links, folderId !== null);
      return true;
    } catch {
      return false;
    }
  }

  /** Puts the links back to Unsorted without the tags the rule added; resolves false on failure. */
  async undo(rule: RuleResponse, matches: readonly RuleMatch[]): Promise<boolean> {
    const moved = this.folderOf(rule) !== null;
    try {
      for (const group of ruleUndoGroups(matches, rule.tags)) {
        if (!moved && group.removeTags.length === 0) {
          continue;
        }
        const response = await firstValueFrom(
          this.api().updateBatch({
            ids: group.ids,
            ...(moved && { folderId: null }),
            ...(group.removeTags.length > 0 && { removeTags: group.removeTags }),
          }),
        );
        this.after(response.links, moved);
      }
      return true;
    } catch {
      this.links.refresh();
      return false;
    }
  }

  private after(changed: readonly LinkResponse[], moved: boolean): void {
    this.links.patchLinks(changed, moved);
    void this.folders.refresh();
    void this.tags.noteLinkSaved();
    void this.views.refresh();
  }

  private api() {
    return this.injector.get(LINKS_API);
  }
}
