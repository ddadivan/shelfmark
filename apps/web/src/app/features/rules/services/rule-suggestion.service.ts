import { computed, effect, inject, Injector, Service, signal, untracked } from '@angular/core';
import { FoldersStore } from '../../../stores/folders.store';
import { RulesStore } from '../../../stores/rules.store';
import type { AppliedRule } from '../models/applied-rule.interface';
import type { RuleSuggestionSource } from '../models/rule-suggestion-source.interface';
import { ruleChipTarget } from '../utils/rule-chip-target';
import { applyRule, changedSomething, revertRule } from '../utils/rule-suggestion';

/**
 * Domain rules in a save form (#398; provided by the form, one per form, `connect`ed once): when
 * the address matches a rule, its folder and tags go into the form at once (unless the user chose
 * them), and `chip` ("Rule: youtube.com → Videos") says so; `dismiss` takes them out again. The
 * form then saves exactly what it shows, with `applyRules: false` while `handled`, so the server
 * does not apply the rule a second time.
 */
@Service({ autoProvided: false })
export class RuleSuggestionService {
  private readonly rules = inject(RulesStore);
  private readonly folders = inject(FoldersStore);
  private readonly injector = inject(Injector);

  /** What the matching rule put into the form; `null` while none did. */
  readonly applied = signal<AppliedRule | null>(null);
  /** The rule whose chip was removed; it stays out until the address matches another one. */
  private readonly dismissed = signal<string | null>(null);
  private source: RuleSuggestionSource | null = null;

  /** Whether the create request should say `applyRules: false`: the form shows the outcome. */
  readonly handled = computed(() => this.rules.loaded());

  /** The chip: shown only while the rule changed something in the form. */
  readonly chip = computed(() => {
    const applied = this.applied();
    if (!changedSomething(applied)) {
      return null;
    }
    const folders = this.folders.entityMap();
    return {
      domain: applied.domain,
      target: ruleChipTarget(applied, (id) => folders[id]?.name ?? ''),
    };
  });

  /** Starts matching the form's address against the rules (loads them once). */
  connect(source: RuleSuggestionSource): void {
    this.source = source;
    void this.rules.load();
    void this.folders.load();
    effect(
      () => {
        // Waits for the folders too, so a rule's folder is known when it goes in.
        const ready = this.rules.loaded() && this.folders.loaded();
        const rule = ready ? this.rules.matchFor(source.url()) : null;
        const folders = this.folders.entityMap();
        untracked(() => {
          const current = this.applied();
          if (rule?.id === current?.ruleId) {
            return;
          }
          if (current) {
            this.revert(current);
          }
          if (rule?.id !== this.dismissed()) {
            this.dismissed.set(null);
          }
          if (rule === null || rule.id === this.dismissed()) {
            return;
          }
          const { fields, applied } = applyRule(source.read(), rule, {
            ...source.locked(),
            folderKnown: rule.folderId !== null && folders[rule.folderId] !== undefined,
          });
          source.put(fields);
          this.applied.set(applied);
        });
      },
      { injector: this.injector },
    );
  }

  /** The chip's remove: the rule's folder and tags leave the form, the rule stays out. */
  dismiss(): void {
    const current = this.applied();
    if (current) {
      this.revert(current);
      this.dismissed.set(current.ruleId);
    }
  }

  private revert(applied: AppliedRule): void {
    if (this.source) {
      this.source.put(revertRule(this.source.read(), applied));
    }
    this.applied.set(null);
  }
}
