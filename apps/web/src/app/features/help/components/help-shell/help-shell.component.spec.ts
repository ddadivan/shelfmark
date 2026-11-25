import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DrawerService } from '@shelfmark/ui';
import { createTranslated } from '../../../../../testing/create-translated';
import { HelpDrawerComponent } from '../help-drawer/help-drawer.component';
import { HelpShellComponent } from './help-shell.component';

function stubViewport(compact: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: compact,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('HelpShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a full-height sidebar beside the main area from 64em, with no menu button', async () => {
    stubViewport(false);
    const root = (await createTranslated(HelpShellComponent)).nativeElement as HTMLElement;

    expect(root.querySelector('.shell__sidebar app-help-sidebar')).not.toBeNull();
    expect(root.querySelector('.shell__column app-help-header')).not.toBeNull();
    expect(root.querySelector('.shell__scroll')).not.toBeNull();
    expect(root.querySelector('button[aria-haspopup="dialog"]')).toBeNull();
  });

  it('drops the sidebar below 64em and opens it as a drawer from the menu button', async () => {
    stubViewport(true);
    const fixture = await createTranslated(HelpShellComponent);
    const root = fixture.nativeElement as HTMLElement;
    const open = vi
      .spyOn(TestBed.inject(DrawerService), 'open')
      .mockReturnValue(undefined as never);

    expect(root.querySelector('.shell__sidebar')).toBeNull();
    root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.click();

    expect(open).toHaveBeenCalledWith(HelpDrawerComponent, { ariaLabel: 'Help topics' });
  });

  it('asks for search when Ctrl K is pressed', async () => {
    stubViewport(false);
    const fixture = await createTranslated(HelpShellComponent);
    const requested = vi.fn();
    fixture.componentInstance.searchRequested.subscribe(requested);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(requested).toHaveBeenCalledTimes(1);
  });
});
