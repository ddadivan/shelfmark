import { computed, inject, Service, signal } from '@angular/core';
import type { CreateLinksBatchItem, RuleResponse } from '@shelfmark/contracts';
import { FoldersStore } from '../../../stores/folders.store';
import { RulesStore } from '../../../stores/rules.store';
import type { BatchRuleRow } from '../models/batch-rule-row.interface';
import type { BatchRuleSource } from '../models/batch-rule-source.interface';
import { ruleChipTarget } from '../utils/rule-chip-target';
import { applyRule, changedSomething } from '../utils/rule-suggestion';

/**
 * Domain rules in the paste-many list (#398; provided by the list, `connect`ed once): each line
 * whose domain matches a rule gets a chip with the rule's folder and tags, the same way Add link
 * applies it. The rule's folder wins over the default folder for all ("New links go to") unless the
 * user chose that folder; its tags come only while no tags for all are chosen. A chip can be
 * removed per line, or every rule ignored for the batch. `itemFields` is what the save sends per
 * link, with `applyRules: false` while `handled`.
 */
@Service({ autoProvided: false })
export class BatchRuleService {
  private readonly rules = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private source: BatchRuleSource | null = null;
  private readonly connected = signal(false);

  /** Lines whose chip was removed (by row key). */
  private readonly dismissed = signal<ReadonlySet<string>>(new Set());
  /** "Apply domain rules" unchecked: no rule for this batch. */
  readonly ignored = signal(false);
  readonly handled = computed(() => this.rules.loaded());

  /** Whether any line matches a rule (the batch switch shows only then). */
  readonly anyMatch = computed(() => this.matches().size > 0);

  /** The rule of each matching line, by row key, whatever the switches say. */
  private readonly matches = computed(() => {
    const map = new Map<string, RuleResponse>();
    if (!this.connected() || !this.rules.loaded() || !this.folders.loaded() || !this.source) {
      return map;
    }
    for (const row of this.source.rows()) {
      const rule = this.rules.matchFor(row.url);
      if (rule) {
        map.set(row.key, rule);
      }
    }
    return map;
  });

  /** What applies to each line now, with its chip; lines without a change are absent. */
  readonly rows = computed(() => {
    const result = new Map<string, BatchRuleRow>();
    const source = this.source;
    if (!source || this.ignored()) {
      return result;
    }
    const folders = this.folders.entityMap();
    const batch = source.batch();
    const locked = source.folderLocked();
    for (const [key, rule] of this.matches()) {
      if (this.dismissed().has(key)) {
        continue;
      }
      const { applied } = applyRule(batch, rule, {
        folder: locked,
        tags: batch.tags.length > 0,
        folderKnown: rule.folderId !== null && folders[rule.folderId] !== undefined,
      });
      if (changedSomething(applied)) {
        const target = ruleChipTarget(applied, (id) => folders[id]?.name ?? '');
        result.set(key, { applied, chip: { domain: rule.domain, target } });
      }
    }
    return result;
  });

  connect(source: BatchRuleSource): void {
    this.source = source;
    this.connected.set(true);
    void this.rules.load();
    void this.folders.load();
  }

  dismiss(key: string): void {
    this.dismissed.update((keys) => new Set(keys).add(key));
  }

  /** The folder and tags one link is saved with when its rule applies; `{}` otherwise. */
  itemFields(key: string): Pick<CreateLinksBatchItem, 'folderId' | 'tags'> {
    const applied = this.rows().get(key)?.applied;
    if (!applied) {
      return {};
    }
    return {
      ...(applied.folderId !== null && { folderId: applied.folderId }),
      ...(applied.tags.length > 0 && { tags: [...applied.tags] }),
    };
  }
}
