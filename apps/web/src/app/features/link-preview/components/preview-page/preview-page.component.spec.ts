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
import { PreviewPageComponent } from './preview-page.component';

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
  const fixture = TestBed.createComponent(PreviewPageComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const overlays = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const button = (name: string | RegExp) => loader.getHarness(UiButtonHarness.with({ name }));
  return {
    stub,
    reader,
    actions,
    fixture,
    element: fixture.nativeElement as HTMLElement,
    loader,
    overlays,
    button,
  };
}

describe('PreviewPageComponent', () => {
  it('is a modal page named after the link, with its title and domain', async () => {
    const { element } = await setup();
    const page = element.querySelector('section');
    expect(page?.getAttribute('role')).toBe('dialog');
    expect(page?.getAttribute('aria-label')).toBe('Preview: Angular overview');
    expect(element.querySelector('h1')?.textContent).toContain('Angular overview');
    expect(element.textContent).toContain('angular.dev');
  });

  it('has no axe violations', async () => {
    const { element, stub, fixture } = await setup();
    // The blocked state: axe cannot cross into a third-party frame.
    stub.body.set(PREVIEW_BODY_KIND.Blocked);
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('goes back to the links', async () => {
    const { stub, button } = await setup();
    await (await button('Back to the links')).click();
    expect(stub.close).toHaveBeenCalledTimes(1);
  });

  it('opens the link in the browser', async () => {
    const { stub, button } = await setup();
    await (await button('Open in browser')).click();
    expect(stub.openInNewTab).toHaveBeenCalledTimes(1);
  });

  it('toggles the favorite from the bar and shows its state', async () => {
    const { stub, fixture, button } = await setup();
    const favorite = await button('Favorite');
    expect(await favorite.getPressed()).toBe('false');
    await favorite.click();
    expect(stub.toggleFavorite).toHaveBeenCalledTimes(1);

    stub.link.set({ ...PREVIEW_STUB_LINK, isFavorite: true });
    await fixture.whenStable();
    expect(await (await button('Favorite')).getPressed()).toBe('true');
  });

  it('shares the link', async () => {
    const { stub, button } = await setup();
    await (await button('Share')).click();
    expect(stub.share).toHaveBeenCalledTimes(1);
  });

  it('edits and copies from the More menu', async () => {
    const { stub, actions, overlays, button } = await setup();
    await (await button('More actions')).click();
    const menu = await overlays.getHarness(UiMenuHarness);
    await menu.clickItem({ text: 'Edit' });
    expect(actions.edit).toHaveBeenCalledWith(PREVIEW_STUB_LINK);

    await (await button('More actions')).click();
    await (await overlays.getHarness(UiMenuHarness)).clickItem({ text: 'Copy link' });
    expect(stub.copyLink).toHaveBeenCalledTimes(1);
  });

  it('has no open button for an address that cannot be opened', async () => {
    const { stub, fixture, loader } = await setup();
    stub.href.set(undefined);
    await fixture.whenStable();
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ name: 'Open in browser' })),
    ).toHaveLength(0);
  });

  it('shows only the back button while the link loads', async () => {
    const { element, loader } = await setup(null as never);
    expect(element.querySelector('.preview-page__domain')).toBeNull();
    const names = await Promise.all(
      (await loader.getAllHarnesses(UiButtonHarness)).map((harness) => harness.getAriaLabel()),
    );
    expect(names).toEqual(['Back to the links']);
  });

  it('switches between Site and Reader and offers reading settings in Reader', async () => {
    const { reader, fixture, element, loader } = await setup();
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ name: 'Reading settings' })),
    ).toHaveLength(0);
    const radio = element.querySelector<HTMLInputElement>('input[type="radio"][value="reader"]');
    radio?.click();
    await fixture.whenStable();
    expect(reader.setMode).toHaveBeenCalledWith('reader');
    expect(element.querySelector('app-preview-reader')).not.toBeNull();
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ name: 'Reading settings' })),
    ).toHaveLength(1);
  });

  it('toggles the details panel', async () => {
    const { reader, button } = await setup();
    const details = await button('Details');
    expect(await details.getPressed()).toBe('false');
    await details.click();
    expect(reader.toggleDetails).toHaveBeenCalledTimes(1);
  });
});
