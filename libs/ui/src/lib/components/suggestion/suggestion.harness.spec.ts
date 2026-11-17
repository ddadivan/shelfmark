import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SuggestionRowComponent } from './suggestion-row/suggestion-row.component';
import { SuggestionComponent } from './suggestion.component';
import { UiSuggestionRowHarness } from './testing/suggestion-row.harness';
import { UiSuggestionHarness } from './testing/suggestion.harness';

@Component({
  imports: [SuggestionRowComponent, SuggestionComponent],
  template: `
    <ui-suggestion-row
      ariaLabel="Suggested tags"
      [addAll]="true"
      [loading]="loading()"
      (acceptAll)="all.set(all() + 1)"
    >
      <ui-suggestion
        label="signals"
        ariaLabel="Add tag signals"
        dismissLabel="Dismiss suggestion signals"
        (accepted)="events.update((e) => [...e, 'accepted'])"
        (dismissed)="events.update((e) => [...e, 'dismissed'])"
      />
      <ui-suggestion label="rxjs" ariaLabel="Add tag rxjs" />
    </ui-suggestion-row>
  `,
})
class HostComponent {
  readonly loading = signal(false);
  readonly all = signal(0);
  readonly events = signal<string[]>([]);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const row = await loader.getHarness(UiSuggestionRowHarness.with({ ariaLabel: 'Suggested tags' }));
  return { fixture, loader, row, cmp: fixture.componentInstance };
}

describe('Suggestion harnesses', () => {
  it('lists the chips with label, name and state, and takes or dismisses them', async () => {
    const { row, cmp } = await setup();
    const [first, second] = await row.getSuggestions();

    expect(await first?.getLabel()).toBe('signals');
    expect(await first?.getAriaLabel()).toBe('Add tag signals');
    expect(await first?.hasDismiss()).toBe(true);
    expect(await second?.hasDismiss()).toBe(false);
    await expect(second?.dismiss()).rejects.toThrow('no dismiss button');

    await first?.dismiss();
    await first?.accept();
    expect(cmp.events()).toEqual(['dismissed', 'accepted']);
    expect(await first?.isAccepted()).toBe(true);
    expect(await second?.isAccepted()).toBe(false);
  });

  it('finds a chip by label and reads the row', async () => {
    const { loader, row, cmp } = await setup();
    const rxjs = await loader.getHarness(UiSuggestionHarness.with({ label: /rx/ }));

    expect(await rxjs.getLabel()).toBe('rxjs');
    expect(await row.getAriaLabel()).toBe('Suggested tags');
    expect(await row.hasAddAll()).toBe(true);
    await row.acceptAll();
    expect(cmp.all()).toBe(1);
  });

  it('reports loading and rejects "Add all" then', async () => {
    const { row, cmp, fixture } = await setup();
    expect(await row.isLoading()).toBe(false);
    cmp.loading.set(true);
    fixture.detectChanges();

    expect(await row.isLoading()).toBe(true);
    expect(await row.getAriaLabel()).toBeNull();
    expect(await row.hasAddAll()).toBe(false);
    await expect(row.acceptAll()).rejects.toThrow('no "Add all"');
  });
});
