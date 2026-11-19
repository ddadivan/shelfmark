import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { DrawerComponent } from './drawer.component';
import { UiDrawerHarness } from './testing/drawer.harness';

@Component({
  imports: [DrawerComponent],
  template: `
    <ui-drawer
      closeLabel="Close panel"
      side="end"
      width="wide"
      resizeLabel="Resize the panel"
      [resizable]="resizable()"
      [(size)]="size"
    >
      <span slot="head">Ask your shelf</span>
      <p>Body</p>
    </ui-drawer>
  `,
})
class HostComponent {
  readonly resizable = signal(true);
  readonly size = signal<number | null>(null);
}

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

async function setup(desktop = true, width = 1600) {
  mockMatchMedia(desktop);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiDrawerHarness);
  const panel = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.ui-drawer');
  return { fixture, harness, panel, host: fixture.componentInstance };
}

describe('ui-drawer resizable (#521)', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('shows a named vertical separator with the width and its limits', async () => {
    const { harness, fixture } = await setup();
    expect(await harness.isResizable()).toBe(true);
    expect(await harness.getResizeLabel()).toBe('Resize the panel');
    expect(await harness.getSize()).toEqual({ now: 440, min: 440, max: 880 });
    const handle = (fixture.nativeElement as HTMLElement).querySelector('.ui-drawer__resize');
    expect(handle?.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle?.getAttribute('tabindex')).toBe('0');
    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
  });

  it('moves 40px with the arrows, jumps with Home and End and resets on a double click', async () => {
    const { harness, host, panel } = await setup();
    await harness.pressResizeKey('ArrowLeft');
    expect(host.size()).toBe(480);
    expect(panel()?.style.getPropertyValue('--ui-drawer-size')).toBe('480px');
    await harness.pressResizeKey('ArrowRight');
    expect(host.size()).toBe(440);
    await harness.pressResizeKey('End');
    expect(await harness.getSize()).toMatchObject({ now: 880 });
    await harness.pressResizeKey('Home');
    expect(host.size()).toBe(440);
    await harness.resetSize();
    expect(host.size()).toBeNull();
    expect(panel()?.style.getPropertyValue('--ui-drawer-size')).toBe('');
  });

  it('caps the width at 70% of the window and clamps a stored width', async () => {
    const { harness, host, fixture } = await setup(true, 1000);
    expect((await harness.getSize()).max).toBe(700);
    host.size.set(5000);
    await fixture.whenStable();
    expect((await harness.getSize()).now).toBe(700);
  });

  it('drags the inline-start edge of an end drawer', async () => {
    const { fixture, host } = await setup();
    const handle = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.ui-drawer__resize',
    );
    const event = (type: string, clientX: number) =>
      Object.assign(new MouseEvent(type, { bubbles: true, clientX, button: 0 }), { pointerId: 1 });
    handle?.dispatchEvent(event('pointerdown', 1000));
    handle?.dispatchEvent(event('pointermove', 900));
    expect(host.size()).toBe(540);
    handle?.dispatchEvent(event('pointerup', 900));
    handle?.dispatchEvent(event('pointermove', 600));
    expect(host.size()).toBe(540);
  });

  it('has no handle below 64em or when not resizable', async () => {
    const compact = await setup(false);
    expect(await compact.harness.isResizable()).toBe(false);
    compact.host.size.set(600);
    await compact.fixture.whenStable();
    expect(compact.panel()?.style.getPropertyValue('--ui-drawer-size')).toBe('');
    TestBed.resetTestingModule();
    const off = await setup(true);
    off.host.resizable.set(false);
    await off.fixture.whenStable();
    expect(await off.harness.isResizable()).toBe(false);
  });

  it('applies the chosen width only from 64em, as a column resize cursor, without animating it', () => {
    const css = compileScss('lib/components/drawer/drawer.component.scss');
    expect(css).toMatch(
      /@media \(width >= 64em\)\s*\{\s*\.ui-drawer--resizable[^{]*\{\s*width: var\(--ui-drawer-size/,
    );
    expect(css).toMatch(/\.ui-drawer__resize\s*\{[^}]*cursor: col-resize/);
    expect(css).not.toMatch(/transition:[^;]*width/);
  });

  it('closes through the harness', async () => {
    const { harness } = await setup();
    await harness.close();
  });
});
