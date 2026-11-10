import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { of } from 'rxjs';
import { axeViolations } from '../../../../testing/axe';
import { setupSettingsPage } from '../../../../testing/settings-page-testbed';
import ImportExportPage from './import-export.page';

async function setup() {
  const view = await setupSettingsPage(ImportExportPage, 'import-export');
  view.exportApi.download.mockReturnValue(of(undefined));
  return view;
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`No button "${label}"`);
  }
  return found;
}

describe('ImportExportPage', () => {
  it('lists both formats with a Download button named after the format', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Export');
    expect(root.querySelector('h2')?.textContent).toContain('Export your data');
    expect(button(root, 'Download JSON').textContent).toContain('Download');
    expect(button(root, 'Download Bookmarks HTML').textContent).toContain('Download');
  });

  it('downloads everything in the chosen format', async () => {
    const { exportApi, root, harness } = await setup();

    button(root, 'Download Bookmarks HTML').click();
    await harness.fixture.whenStable();
    button(root, 'Download JSON').click();
    await harness.fixture.whenStable();

    expect(exportApi.download).toHaveBeenNthCalledWith(1, EXPORT_FORMAT.Html, {});
    expect(exportApi.download).toHaveBeenNthCalledWith(2, EXPORT_FORMAT.Json, {});
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
