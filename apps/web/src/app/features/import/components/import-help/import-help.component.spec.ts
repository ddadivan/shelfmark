import { ComponentFixture, TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ImportHelpComponent } from './import-help.component';
import { importHelpSteps } from './import-help-steps';

async function setup(
  mac: boolean,
): Promise<{ fixture: ComponentFixture<ImportHelpComponent>; host: HTMLElement }> {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const fixture = TestBed.createComponent(ImportHelpComponent);
  fixture.componentRef.setInput('mac', mac);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

const step = (host: HTMLElement, id: string): HTMLElement | null =>
  host.querySelector(`[data-browser="${id}"]`);

const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('ImportHelpComponent', () => {
  it('shows Windows keys as words and leaves Safari out elsewhere', async () => {
    const { host } = await setup(false);
    expect(Array.from(host.querySelectorAll('li')).map((li) => li.dataset['browser'])).toEqual([
      'chrome',
      'edge',
      'firefox',
    ]);
    for (const id of ['chrome', 'edge', 'firefox']) {
      const caps = Array.from(step(host, id)?.querySelectorAll('kbd') ?? []).map(text);
      expect(caps).toEqual(['Ctrl', 'Shift', 'O']);
      expect(step(host, id)?.querySelector('ui-icon')).toBeNull();
    }
    expect(text(step(host, 'chrome'))).toBe(
      'Chrome: open the bookmark manager (Ctrl+Shift+O), open its ⋮ menu and choose “Export bookmarks”.',
    );
    expect(text(step(host, 'edge'))).toContain('“Export favorites”');
  });

  it('shows Mac glyph caps with spoken names and adds Safari on a Mac', async () => {
    const { host } = await setup(true);
    expect(Array.from(host.querySelectorAll('li')).map((li) => li.dataset['browser'])).toEqual([
      'chrome',
      'edge',
      'firefox',
      'safari',
    ]);
    const chrome = Array.from(step(host, 'chrome')?.querySelectorAll('kbd') ?? []);
    expect(
      chrome.map(
        (cap) => cap.querySelector('ui-icon')?.getAttribute('ng-reflect-name') ?? text(cap),
      ),
    ).toHaveLength(3);
    expect(chrome.map((cap) => text(cap.querySelector('.import-help__sr')))).toEqual([
      'Command',
      'Option',
      '',
    ]);
    expect(text(chrome[2] ?? null)).toBe('B');
    expect(chrome[0]?.querySelectorAll('ui-icon')).toHaveLength(1);
    const firefox = Array.from(step(host, 'firefox')?.querySelectorAll('kbd') ?? []);
    expect(firefox.map((cap) => text(cap.querySelector('.import-help__sr')))).toEqual([
      'Command',
      'Shift',
      '',
    ]);
    expect(text(firefox[2] ?? null)).toBe('O');
    // Edge documents no Favorites shortcut on a Mac: the step goes through its menu.
    expect(step(host, 'edge')?.querySelector('kbd')).toBeNull();
    expect(text(step(host, 'edge'))).toContain('from the ⋯ menu');
    expect(text(step(host, 'safari'))).toBe('Safari: File, Export, Bookmarks.');
  });

  it('keeps the text around the caps and never prints the placeholder', async () => {
    const { host } = await setup(true);
    expect(host.textContent).not.toContain('{{');
    expect(host.textContent).not.toContain('');
    expect(text(step(host, 'firefox'))).toMatch(/^Firefox: open the Library \(.*\), then Import/);
  });

  it('has no axe violations on either platform', async () => {
    for (const mac of [false, true]) {
      const { host } = await setup(mac);
      expect(await axeViolations(host)).toEqual([]);
      TestBed.resetTestingModule();
    }
  });
});

describe('importHelpSteps', () => {
  it('puts the platform shortcut on Chrome and keeps Firefox the same', () => {
    expect(importHelpSteps(true).find((s) => s.id === 'chrome')?.keys).toEqual([
      'command',
      'alt',
      'b',
    ]);
    expect(importHelpSteps(false).find((s) => s.id === 'chrome')?.keys).toEqual([
      'command',
      'shift',
      'o',
    ]);
    expect(importHelpSteps(true).find((s) => s.id === 'firefox')?.keys).toEqual(
      importHelpSteps(false).find((s) => s.id === 'firefox')?.keys,
    );
  });
});
