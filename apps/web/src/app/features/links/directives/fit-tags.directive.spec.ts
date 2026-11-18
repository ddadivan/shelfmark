import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FitTagsDirective } from './fit-tags.directive';

@Component({
  imports: [FitTagsDirective],
  template: `
    <ul [appFitTags]="tags().length" #fit="appFitTags" data-w="200" style="column-gap: 4px">
      @for (tag of tags(); track tag; let i = $index) {
        <li data-tag [attr.data-w]="widths()[i]" [class.off]="i >= fit.visible()">{{ tag }}</li>
      }
      <li data-more data-w="30" [class.off]="fit.hidden() === 0">+{{ fit.hidden() }}</li>
    </ul>
    <span class="clip">{{ fit.clipFirst() }}</span>
  `,
})
class HostComponent {
  readonly tags = signal(['angular', 'signals', 'forms']);
  readonly widths = signal([60, 60, 60]);
}

/** jsdom has no layout: every element reports the width in its `data-w`. */
function fakeWidths(): void {
  const width = function (this: HTMLElement): number {
    return Number(this.dataset['w'] ?? 0);
  };
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(width);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(width);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(width);
}

async function setup(widths: number[]) {
  fakeWidths();
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.widths.set(widths);
  fixture.componentInstance.tags.set(widths.map((_, i) => `tag${i}`));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    shown: () =>
      [...element.querySelectorAll('li[data-tag]:not(.off)')].map((li) => li.textContent?.trim()),
    more: () => element.querySelector('li[data-more]'),
    clip: () => element.querySelector('.clip')?.textContent,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('FitTagsDirective', () => {
  it('shows every tag and no +N chip when they all fit', async () => {
    const { shown, more } = await setup([60, 60, 60]); // 60+4+60+4+60 = 188 <= 200
    expect(shown()).toEqual(['tag0', 'tag1', 'tag2']);
    expect(more()?.classList).toContain('off');
  });

  it('keeps only whole tags that fit next to the +N chip', async () => {
    const { shown, more } = await setup([60, 60, 60, 60]); // 3 tags + gap + more = 60*3+8+4+30 > 200
    expect(shown()).toEqual(['tag0', 'tag1']);
    expect(more()?.classList).not.toContain('off');
    expect(more()?.textContent?.trim()).toBe('+2');
  });

  it('cuts the first tag only when not even it fits', async () => {
    const { shown, more, clip } = await setup([260, 60]);
    expect(shown()).toEqual(['tag0']);
    expect(clip()).toBe('true');
    expect(more()?.textContent?.trim()).toBe('+1');
  });

  it('measures again when the tags change', async () => {
    const { fixture, shown } = await setup([60, 60, 60, 60]);
    fixture.componentInstance.widths.set([60, 60]);
    fixture.componentInstance.tags.set(['a', 'b']);
    await fixture.whenStable();
    expect(shown()).toEqual(['a', 'b']);
  });
});
