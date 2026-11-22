import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createLinkPreviewStub, PREVIEW_STUB_LINK } from '../../../../../testing/link-preview-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PREVIEW_BODY_KIND } from '../../models/preview-body-kind.const';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewPanelComponent } from './preview-panel.component';

async function setup(link = PREVIEW_STUB_LINK) {
  const stub = createLinkPreviewStub(link);
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: LinkPreviewService, useValue: stub }],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewPanelComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = (name: string | RegExp) => loader.getHarness(UiButtonHarness.with({ name }));
  return { stub, fixture, element: fixture.nativeElement as HTMLElement, loader, button };
}

describe('PreviewPanelComponent', () => {
  it('names the region after the link and shows its title and address', async () => {
    const { element } = await setup();
    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe(
      'Preview: Angular overview',
    );
    expect(element.querySelector('h2')?.textContent).toContain('Angular overview');
    expect(element.textContent).toContain('angular.dev/overview');
  });

  it('has no axe violations', async () => {
    const { element, stub, fixture } = await setup();
    // The blocked state: axe cannot cross into a third-party frame.
    stub.body.set(PREVIEW_BODY_KIND.Blocked);
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('goes to the previous and next link', async () => {
    const { stub, fixture, button } = await setup();
    stub.previousId.set('id-0');
    stub.nextId.set('id-2');
    await fixture.whenStable();
    await (await button('Previous link')).click();
    await (await button('Next link')).click();
    expect(stub.go).toHaveBeenNthCalledWith(1, -1);
    expect(stub.go).toHaveBeenNthCalledWith(2, 1);
  });

  it('disables previous and next at the ends of the feed', async () => {
    const { button } = await setup();
    expect(await (await button('Previous link')).isDisabled()).toBe(true);
    expect(await (await button('Next link')).isDisabled()).toBe(true);
  });

  it('toggles the favorite and shows its state', async () => {
    const { stub, fixture, button } = await setup();
    const favorite = await button('Favorite');
    expect(await favorite.getPressed()).toBe('false');
    await favorite.click();
    expect(stub.toggleFavorite).toHaveBeenCalledTimes(1);

    stub.link.set({ ...PREVIEW_STUB_LINK, isFavorite: true });
    await fixture.whenStable();
    expect(await (await button('Favorite')).getPressed()).toBe('true');
  });

  it('edits and copies the link', async () => {
    const { stub, button } = await setup();
    await (await button('Edit')).click();
    await (await button('Copy link')).click();
    expect(stub.edit).toHaveBeenCalledTimes(1);
    expect(stub.copyLink).toHaveBeenCalledTimes(1);
  });

  it('swaps the copy icon for a check while the link counts as copied', async () => {
    const { stub, fixture, button } = await setup();
    const icon = () =>
      fixture.nativeElement.querySelector('[aria-label="Copy link"] use')?.getAttribute('href');
    expect(icon()).toContain('#sm-copy');
    stub.copied.set(true);
    await fixture.whenStable();
    expect(icon()).toContain('#sm-check');
    expect(await button('Copy link')).toBeDefined();
  });

  it('hides and shows the list with the wider button', async () => {
    const { stub, fixture, button } = await setup();
    const wider = await button('Wider preview');
    expect(await wider.getPressed()).toBe('false');
    await wider.click();
    expect(stub.toggleList).toHaveBeenCalledTimes(1);

    stub.listHidden.set(true);
    await fixture.whenStable();
    expect(await (await button('Wider preview')).getPressed()).toBe('true');
  });

  it('opens the link in a new tab from the Open button', async () => {
    const { stub, loader } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Open' }))).click();
    expect(stub.openInNewTab).toHaveBeenCalledTimes(1);
  });

  it('has no Open button for an address that cannot be opened', async () => {
    const { stub, fixture, loader } = await setup();
    stub.href.set(undefined);
    await fixture.whenStable();
    expect(await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Open' }))).toHaveLength(0);
  });

  it('closes the preview', async () => {
    const { stub, button } = await setup();
    await (await button('Close preview')).click();
    expect(stub.close).toHaveBeenCalledTimes(1);
  });

  it('shows only previous, next and close while the link loads', async () => {
    const { element, loader } = await setup(null as never);
    expect(element.querySelector('h2')).toBeNull();
    const names = await Promise.all(
      (await loader.getAllHarnesses(UiButtonHarness)).map((harness) => harness.getAriaLabel()),
    );
    expect(names).toEqual(['Previous link', 'Next link', 'Close preview']);
  });
});
