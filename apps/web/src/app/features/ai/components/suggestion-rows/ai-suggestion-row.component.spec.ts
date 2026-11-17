import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { SUGGESTION_KIND } from '@shelfmark/contracts';
import { ReducedMotion } from '@shelfmark/ui';
import { UiSuggestionHarness, UiSuggestionRowHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { AI_CHIP_FLASH_MS } from './models/ai-chip-flash-ms.const';
import type { AiChipView } from './models/ai-chip-view.interface';
import { AiSuggestionRowComponent } from './ai-suggestion-row.component';

function chip(id: string, kind: AiChipView['kind'] = SUGGESTION_KIND.Tag): AiChipView {
  return {
    id,
    kind,
    label: id,
    ariaLabel: `Add tag ${id}`,
    dismissLabel: `Dismiss suggestion ${id}`,
    acceptedMessage: `Tag ${id} added`,
  };
}

@Component({
  imports: [AiSuggestionRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input aria-label="Tags" />
    <app-ai-suggestion-row
      [chips]="chips()"
      label="Suggested"
      ariaLabel="Suggested tags"
      [loading]="loading()"
      loadingLabel="Suggesting…"
      [allowAddAll]="true"
      addAllLabel="Add all"
      addedAllMessage="Suggested tags added"
      newLabel="New"
      (accepted)="take($event)"
      (dismissed)="drop($event)"
      (acceptedAll)="chips.set([])"
      (cleared)="cleared = cleared + 1"
    />
  `,
})
class HostComponent {
  readonly chips = signal<readonly AiChipView[]>([chip('angular'), chip('signals')]);
  readonly loading = signal(false);
  readonly taken: string[] = [];
  cleared = 0;

  take(view: AiChipView): void {
    this.taken.push(view.id);
    this.drop(view);
  }

  drop(view: AiChipView): void {
    this.chips.update((list) => list.filter((item) => item.id !== view.id));
  }
}

async function setup(reduced = true) {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  TestBed.inject(ReducedMotion).setAppReduced(reduced);
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, host: fixture.componentInstance, loader };
}

function liveText(element: HTMLElement): string[] {
  return [...element.querySelectorAll('[aria-live="polite"]')]
    .map((node) => node.textContent?.trim() ?? '')
    .filter((text) => text !== '');
}

describe('AiSuggestionRowComponent', () => {
  it('draws the chips with "Add all" and passes axe', async () => {
    const { fixture, loader } = await setup();
    const row = await loader.getHarness(
      UiSuggestionRowHarness.with({ ariaLabel: 'Suggested tags' }),
    );
    expect(await row.hasAddAll()).toBe(true);
    const chips = await row.getSuggestions();
    expect(await Promise.all(chips.map((item) => item.getLabel()))).toEqual(['angular', 'signals']);
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('shows the skeleton while loading and nothing without chips', async () => {
    const { fixture, host, loader } = await setup();
    host.loading.set(true);
    host.chips.set([]);
    await fixture.whenStable();
    const row = await loader.getHarness(UiSuggestionRowHarness);
    expect(await row.isLoading()).toBe(true);
    host.loading.set(false);
    await fixture.whenStable();
    expect(await loader.getAllHarnesses(UiSuggestionRowHarness)).toEqual([]);
  });

  it('applies a taken chip, says so and moves focus to the next chip', async () => {
    const { fixture, host, loader } = await setup();
    const first = await loader.getHarness(UiSuggestionHarness.with({ label: 'angular' }));
    await first.accept();
    await fixture.whenStable();
    expect(host.taken).toEqual(['angular']);
    expect(liveText(fixture.nativeElement)).toEqual(['Tag angular added']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Add tag signals');
  });

  it('keeps a taken chip solid for the flash, then applies it', async () => {
    const { fixture, host, loader } = await setup(false);
    const first = await loader.getHarness(UiSuggestionHarness.with({ label: 'angular' }));
    await first.accept();
    expect(await first.isAccepted()).toBe(true);
    expect(host.taken).toEqual([]);
    await vi.waitFor(() => expect(host.taken).toEqual(['angular']), {
      timeout: AI_CHIP_FLASH_MS * 5,
    });
    await fixture.whenStable();
    expect(await loader.getAllHarnesses(UiSuggestionHarness.with({ label: 'angular' }))).toEqual(
      [],
    );
  });

  it('asks for the field once the last chip is gone, and says it outside the row', async () => {
    const { fixture, host, loader } = await setup();
    host.chips.set([chip('angular')]);
    await fixture.whenStable();
    const only = await loader.getHarness(UiSuggestionHarness);
    await only.dismiss();
    await fixture.whenStable();
    expect(host.cleared).toBe(1);

    host.chips.set([chip('angular'), chip('signals')]);
    await fixture.whenStable();
    await (await loader.getHarness(UiSuggestionRowHarness)).acceptAll();
    await fixture.whenStable();
    expect(host.cleared).toBe(2);
    expect(liveText(fixture.nativeElement)).toEqual(['Suggested tags added']);
  });
});
