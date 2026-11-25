import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { UiButtonHarness, UiMenuHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { createLinkPreviewStub, PREVIEW_STUB_LINK } from '../../../../../testing/link-preview-stub';
import {
  createLinkActionsStub,
  createPreviewReaderStub,
} from '../../../../../testing/preview-reader-stub';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PREVIEW_BODY_KIND } from '../../models/preview-body-kind.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';
import { LinkInlineEditService } from '../../services/link-inline-edit.service';
import { PreviewPanelComponent } from './preview-panel.component';

async function setup(link = PREVIEW_STUB_LINK) {
  const stub = createLinkPreviewStub(link);
  const reader = createPreviewReaderStub();
  const actions = createLinkActionsStub();
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LinkPreviewService, useValue: stub },
      { provide: PreviewReaderService, useValue: reader },
      { provide: LinkActionsService, useValue: actions },
      {
        provide: LinkInlineEditService,
        useValue: { saveTitle: vi.fn(), saveNote: vi.fn() },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewPanelComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const overlays = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const button = (name: string | RegExp) => loader.getHarness(UiButtonHarness.with({ name }));
  const menu = async () => {
    await (await button('More actions')).click();
    return overlays.getHarness(UiMenuHarness);
  };
  return {
    stub,
    reader,
    actions,
    fixture,
    element: fixture.nativeElement as HTMLElement,
    loader,
    button,
    menu,
  };
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

  it('edits and copies from the ⋯ menu', async () => {
    const { stub, actions, menu } = await setup();
    await (await menu()).clickItem({ text: 'Edit' });
    expect(actions.edit).toHaveBeenCalledWith(PREVIEW_STUB_LINK);
    await (await menu()).clickItem({ text: 'Copy link' });
    expect(stub.copyLink).toHaveBeenCalledTimes(1);
  });

  it('widens the preview from its own toolbar button, not from the ⋯ menu', async () => {
    const { stub, button } = await setup();
    await (await button('Wider preview')).click();
    expect(stub.toggleList).toHaveBeenCalledTimes(1);
  });

  it('moves, reminds and deletes from the ⋯ menu', async () => {
    const { actions, menu } = await setup();
    await (await menu()).clickItem({ text: 'Move to folder…' });
    await (await menu()).clickItem({ text: 'Delete' });
    expect(actions.move).toHaveBeenCalledWith(PREVIEW_STUB_LINK);
    expect(actions.delete).toHaveBeenCalledWith(PREVIEW_STUB_LINK);
  });

  it('switches to Reader and back, with reading settings only in Reader', async () => {
    const { reader, fixture, element, loader } = await setup();
    const settings = () =>
      loader.getAllHarnesses(UiButtonHarness.with({ name: 'Reading settings' }));
    expect(await settings()).toHaveLength(0);
    expect(element.querySelector('app-preview-body')).not.toBeNull();
    element.querySelector<HTMLInputElement>('input[type="radio"][value="reader"]')?.click();
    await fixture.whenStable();
    expect(reader.setMode).toHaveBeenCalledWith('reader');
    expect(element.querySelector('app-preview-reader')).not.toBeNull();
    expect(element.querySelector('app-preview-body')).toBeNull();
    expect(await settings()).toHaveLength(1);
  });

  it('toggles the details panel', async () => {
    const { reader, button } = await setup();
    const details = await button('Details');
    expect(await details.getPressed()).toBe('false');
    await details.click();
    expect(reader.toggleDetails).toHaveBeenCalledTimes(1);
    expect(await (await button('Details')).getPressed()).toBe('true');
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
    expect(names).toEqual(['Previous link', 'Next link', 'Full screen', 'Close preview']);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
  });

  it('has the full screen window control after the divider, next to Close', async () => {
    const { stub, fixture, element, button } = await setup();
    const full = await button('Full screen');
    expect(await full.getPressed()).toBe('false');
    expect(element.querySelector('.preview-panel__position')).toBeNull();
    await full.click();
    expect(stub.toggleFullScreen).toHaveBeenCalledTimes(1);
    await fixture.whenStable();
    const exit = await button('Exit full screen');
    expect(await exit.getPressed()).toBe('true');
    expect(element.querySelector('.preview-panel')?.classList).toContain('preview-panel--full');
    expect(element.querySelector('.preview-panel__position')?.textContent?.trim()).toBe('3 of 17');
    const sep = element.querySelector('.preview-panel__sep');
    const next = sep?.nextElementSibling;
    expect(next?.querySelector('button')?.getAttribute('aria-label')).toBe('Exit full screen');
  });

  it('has no full screen button where the split view is not available', async () => {
    const { stub, fixture, loader } = await setup();
    stub.fullScreenAvailable.set(false);
    await fixture.whenStable();
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ name: 'Full screen' })),
    ).toHaveLength(0);
  });
});
