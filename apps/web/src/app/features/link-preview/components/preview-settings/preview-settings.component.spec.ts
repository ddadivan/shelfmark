import { TestBed } from '@angular/core/testing';
import {
  LIBRARY_SETTINGS_DEFAULT,
  LINK_CLICK_ACTION,
  type LibrarySettings,
} from '@shelfmark/contracts';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { PreviewSettingsComponent } from './preview-settings.component';

async function setup(patch: Partial<LibrarySettings> = {}) {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(PreviewSettingsComponent);
  fixture.componentRef.setInput('library', { ...LIBRARY_SETTINGS_DEFAULT, ...patch });
  const changed = vi.fn();
  fixture.componentInstance.changed.subscribe(changed);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const radio = (title: string) => {
    const label = [...element.querySelectorAll('label')].find((candidate) =>
      candidate.textContent.includes(title),
    );
    return label?.querySelector<HTMLInputElement>('input[type="radio"]');
  };
  return { fixture, element, changed, radio };
}

describe('PreviewSettingsComponent', () => {
  it('offers the two click actions and checks the current one', async () => {
    const { radio } = await setup({ clickAction: LINK_CLICK_ACTION.Open });
    expect(radio('Opens it in a new tab')?.checked).toBe(true);
    expect(radio('Opens the preview')?.checked).toBe(false);
  });

  it('follows the setting when it changes', async () => {
    const { fixture, radio } = await setup({ clickAction: LINK_CLICK_ACTION.Open });
    fixture.componentRef.setInput('library', {
      ...LIBRARY_SETTINGS_DEFAULT,
      clickAction: LINK_CLICK_ACTION.Preview,
    });
    await fixture.whenStable();
    expect(radio('Opens the preview')?.checked).toBe(true);
  });

  it('emits the chosen click action', async () => {
    const { radio, changed } = await setup({ clickAction: LINK_CLICK_ACTION.Open });
    radio('Opens the preview')?.click();
    expect(changed).toHaveBeenCalledWith({ clickAction: LINK_CLICK_ACTION.Preview });
  });

  it('shows "None yet." without sites', async () => {
    const { element } = await setup({ previewNewTabHosts: [] });
    expect(element.textContent).toContain('None yet.');
    expect(element.querySelector('ul')).toBeNull();
  });

  it('lists the sites as removable chips and emits the list without the removed one', async () => {
    const { element, changed } = await setup({
      previewNewTabHosts: ['github.com', 'x.com', 'example.org'],
    });
    const items = [...element.querySelectorAll('li')].map((item) => item.textContent.trim());
    expect(items).toEqual(['github.com', 'x.com', 'example.org']);

    element.querySelector<HTMLButtonElement>('button[aria-label="Remove x.com"]')?.click();
    expect(changed).toHaveBeenCalledWith({ previewNewTabHosts: ['github.com', 'example.org'] });
  });

  it('has no axe violations', async () => {
    const { element } = await setup({ previewNewTabHosts: ['github.com'] });
    document.body.append(element);
    const violations = await axeViolations(element);
    element.remove();
    expect(violations).toEqual([]);
  });
});
