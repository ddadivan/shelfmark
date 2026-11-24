import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideRouter, Router } from '@angular/router';
import { UiPopoverHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { readRepoFile } from '../../../../../testing/read-repo-file';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinkCardTagsComponent } from './link-card-tags.component';

const TAGS = ['angular', 'javascript', 'reading', 'video', 'design'];

async function setup(tags: readonly string[] = TAGS, interactive = true) {
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), provideRouter([{ path: '**', children: [] }])],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LinkCardTagsComponent);
  fixture.componentRef.setInput('tags', tags);
  fixture.componentRef.setInput('interactive', interactive);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  return { fixture, element, loader, router: TestBed.inject(Router) };
}

/** Buttons of the card footer by accessible name (the chips' text or `aria-label`). */
function buttons(root: ParentNode): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('button')];
}

function more(element: HTMLElement): HTMLButtonElement | undefined {
  return buttons(element).find((button) => button.getAttribute('aria-haspopup') === 'dialog');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('LinkCardTagsComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('shows the first three tags as "#tag", then "+N" named after the other tags', async () => {
    const { element } = await setup();
    const visible = buttons(element);
    expect(visible.map((button) => button.textContent.trim())).toEqual([
      '#angular',
      '#javascript',
      '#reading',
      '+2',
    ]);
    const trigger = more(element);
    expect(trigger?.getAttribute('aria-label')).toBe('2 more tags: video, design');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses the singular name for one more tag and has no "+N" for up to three', async () => {
    const four = await setup(['angular', 'javascript', 'reading', 'video']);
    expect(more(four.element)?.getAttribute('aria-label')).toBe('1 more tag: video');
    TestBed.resetTestingModule();

    const one = await setup(['angular']);
    expect(buttons(one.element).map((button) => button.textContent.trim())).toEqual(['#angular']);
    // The "#" is drawn for the eye only: the accessible name stays the tag.
    expect(one.element.querySelector('[aria-hidden="true"]')?.textContent).toBe('#');
    expect(more(one.element)).toBeUndefined();
    expect(one.element.querySelector('ui-popover')).toBeNull();
  });

  it('renders nothing without tags', async () => {
    const { element } = await setup([]);
    expect(element.textContent.trim()).toBe('');
  });

  it('a click on "+N" opens the "Other tags" dialog with the tags not shown on the card', async () => {
    const { element, loader, fixture } = await setup();
    const popover = await loader.getHarness(UiPopoverHarness);
    expect(await popover.isOpen()).toBe(false);

    more(element)?.click();
    await settle(fixture);

    expect(await popover.isOpen()).toBe(true);
    expect(await popover.getHeading()).toBe('Other tags');
    expect(await popover.isTriggerExpanded()).toBe(true);
    const host = await popover.host();
    expect(await host.getAttribute('role')).toBe('dialog');
    const dialog = document.querySelector('ui-popover') as HTMLElement;
    expect(buttons(dialog).map((button) => button.textContent.trim())).toEqual(TAGS.slice(3));
  });

  it('opens on hover after the hover-intent delay', async () => {
    const { element, fixture } = await setup();
    more(element)?.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await settle(fixture);
    expect(document.querySelector('.cdk-overlay-pane ui-popover')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await settle(fixture);
    expect(document.querySelector('.cdk-overlay-pane ui-popover')?.textContent).toContain(
      'Other tags',
    );
  });

  it('a chip in the dialog lists the links with that tag and closes the dialog', async () => {
    const { element, fixture, loader, router } = await setup();
    more(element)?.click();
    await settle(fixture);
    const dialog = document.querySelector('ui-popover') as HTMLElement;
    buttons(dialog)
      .find((button) => button.textContent.trim() === 'design')
      ?.click();
    await settle(fixture);

    await vi.waitFor(() => {
      expect(router.url).toBe('/links?tag=design');
    });
    expect(await (await loader.getHarness(UiPopoverHarness)).isOpen()).toBe(false);
  });

  it('a tag on the card lists its links too', async () => {
    const { element, router } = await setup();
    buttons(element)[0]?.click();
    await vi.waitFor(() => {
      expect(router.url).toBe('/links?tag=angular');
    });
  });

  it('Esc closes the dialog and gives focus back to "+N"', async () => {
    const { element, fixture, loader } = await setup();
    document.body.append(element);
    const trigger = more(element) as HTMLButtonElement;
    trigger.focus();
    // Enter on the button: a click with `detail` 0 moves focus into the dialog.
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    await settle(fixture);
    const dialog = document.querySelector('ui-popover') as HTMLElement;
    expect(dialog.contains(document.activeElement)).toBe(true);

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(await (await loader.getHarness(UiPopoverHarness)).isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    element.remove();
  });

  it('a press outside closes the dialog', async () => {
    const { element, fixture, loader } = await setup();
    more(element)?.click();
    await settle(fixture);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(await (await loader.getHarness(UiPopoverHarness)).isOpen()).toBe(false);
  });

  it('read-only: plain tag chips that filter nothing, "+N" still opens the list', async () => {
    const { element, fixture, router } = await setup(TAGS, false);
    expect(buttons(element).map((button) => button.textContent.trim())).toEqual(['+2']);
    expect(element.textContent).toContain('#angular');
    more(element)?.click();
    await settle(fixture);
    const dialog = document.querySelector('ui-popover') as HTMLElement;
    expect(dialog.textContent).toContain('design');
    expect(buttons(dialog)).toHaveLength(0);
    expect(router.url).toBe('/');
  });

  it('keeps "+N" and the tags above the card\'s stretched link, so hover reaches them', () => {
    const scss = readRepoFile(
      'apps/web/src/app/features/links/components/link-card-tags/link-card-tags.component.scss',
    );
    expect(scss).toMatch(
      /\.link-card-tags__more,\s*:host\(\.link-card-tags--interactive\) \.link-card-tags__tag \{\s*position: relative;\s*z-index: 2;/,
    );
  });

  it('has no axe violations, closed and open', async () => {
    const { element, fixture } = await setup();
    document.body.append(element);
    const rules = { 'color-contrast': { enabled: false } };
    expect((await axe.run(element, { rules })).violations).toEqual([]);
    more(element)?.click();
    await settle(fixture);
    const dialog = document.querySelector('ui-popover') as HTMLElement;
    expect((await axe.run(dialog, { rules })).violations).toEqual([]);
    element.remove();
  });
});
