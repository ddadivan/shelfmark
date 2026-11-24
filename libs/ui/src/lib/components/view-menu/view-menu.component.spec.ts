import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../../services/overlay/overlay-layer';
import type { ViewMenuFieldChange } from './models/view-menu-field-change.interface';
import type { ViewMenuField } from './models/view-menu-field.interface';
import type { ViewMenuStepText } from './models/view-menu-step-text.type';
import { UiViewMenuHarness } from './testing/view-menu.harness';
import { viewMenuPositions } from './view-menu-positions';
import { ViewMenuComponent } from './view-menu.component';

@Component({
  imports: [ViewMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-view-menu
      label="View"
      heading="Grid size"
      smallLabel="Small"
      largeLabel="Large"
      [steps]="6"
      [(step)]="step"
      [stepText]="stepText()"
      [gridDisabled]="list()"
      [fields]="fields()"
      (fieldChange)="onField($event)"
      (opened)="opened.set(opened() + 1)"
      (closed)="closed.set(closed() + 1)"
    />
    <button id="outside" type="button">Outside</button>
  `,
})
class HostComponent {
  readonly step = signal(4);
  readonly list = signal(false);
  readonly stepText = signal<ViewMenuStepText | undefined>(undefined);
  readonly opened = signal(0);
  readonly closed = signal(0);
  readonly changes = signal<ViewMenuFieldChange[]>([]);
  readonly fields = signal<ViewMenuField[]>([
    { id: 'note', label: 'Note', checked: true },
    { id: 'tags', label: 'Hashtags', checked: false },
    { id: 'folder', label: 'Folder', checked: true },
    { id: 'date', label: 'Date', checked: true },
  ]);

  onField(change: ViewMenuFieldChange): void {
    this.changes.update((list) => [...list, change]);
    this.fields.update((list) =>
      list.map((f) => (f.id === change.id ? { ...f, checked: change.checked } : f)),
    );
  }
}

@Component({
  imports: [ViewMenuComponent],
  template: `<ui-view-menu inline label="View" heading="Grid size" [fields]="[]" />`,
})
class InlineHostComponent {}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  await settle();
  const root = fixture.nativeElement as HTMLElement;
  document.body.append(root);
  const trigger = root.querySelector<HTMLButtonElement>(
    '.ui-view-menu__trigger',
  ) as HTMLButtonElement;
  const outside = root.querySelector<HTMLElement>('#outside') as HTMLElement;
  const panel = () => document.querySelector<HTMLElement>('.ui-view-menu__panel') as HTMLElement;
  const range = () => panel().querySelector('input[type="range"]') as HTMLInputElement;
  const switches = () => [...panel().querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
  const key = async (target: EventTarget, name: string, init: KeyboardEventInit = {}) => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle();
  };
  const click = async (target: HTMLElement, detail = 1) => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
    await settle();
  };
  return { fixture, settle, root, trigger, outside, panel, range, switches, key, click };
}

describe('ViewMenuComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
    document.body.replaceChildren();
  });

  it('renders a trigger with the label that announces a dialog, closed and empty', async () => {
    const { trigger, panel } = await setup();
    expect(trigger.textContent).toContain('View');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(panel().id);
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-label')).toBe('View');
    expect(panel().classList).not.toContain('ui-view-menu__panel--shown');
    expect(panel().querySelector('.ui-view-menu__surface')).toBeNull();
  });

  it('opens on a click into a pane of the menu layer with the slider and the switches', async () => {
    const { fixture, click, trigger, panel, range, switches } = await setup();
    await click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel().closest('.cdk-overlay-pane')).not.toBeNull();
    expect(panel().closest('.cdk-overlay-connected-position-bounding-box')?.classList).toContain(
      overlayLayerClass(OVERLAY_LAYER.Menu),
    );
    expect(panel().querySelector('.ui-view-menu__heading')?.textContent).toBe('Grid size');
    expect(panel().querySelector('.ui-view-menu__step')?.textContent).toBe('4 / 6');
    expect(panel().querySelector('.ui-view-menu__ends')?.textContent).toMatch(/Small\s*Large/);
    expect(range().min).toBe('1');
    expect(range().max).toBe('6');
    expect(range().value).toBe('4');
    expect(range().getAttribute('aria-label')).toBe('Grid size');
    expect(range().getAttribute('aria-valuetext')).toBe('4 / 6');
    // The hairline under the grid size is the block's own edge (no separator element).
    expect(panel().querySelector('[role="separator"]')).toBeNull();
    expect(switches().map((s) => s.getAttribute('aria-label'))).toEqual([
      'Note',
      'Hashtags',
      'Folder',
      'Date',
    ]);
    expect(switches().map((s) => s.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'true',
      'true',
    ]);
    expect(fixture.componentInstance.opened()).toBe(1);
    // A pointer open leaves focus on the trigger.
    expect(panel().contains(document.activeElement)).toBe(false);
  });

  it('prefers below the trigger, end edge first, and flips above', () => {
    const [first, second, third] = viewMenuPositions();
    expect(first).toEqual({ originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top' });
    expect(second?.originX).toBe('start');
    expect(third?.originY).toBe('top');
  });

  it('a click on an open trigger closes it', async () => {
    const { fixture, click, trigger } = await setup();
    await click(trigger);
    await click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.closed()).toBe(1);
  });

  it('a keyboard activation moves focus to the slider', async () => {
    const { click, trigger, range } = await setup();
    await click(trigger, 0);
    expect(document.activeElement).toBe(range());
  });

  it('closes on Esc from inside and gives focus back to the trigger', async () => {
    const { fixture, click, trigger, range, key } = await setup();
    await click(trigger, 0);
    await key(range(), KEYBOARD_KEY.Escape);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.closed()).toBe(1);
  });

  it('closes on Esc while focus is on the trigger', async () => {
    const { click, trigger, key } = await setup();
    trigger.focus();
    await click(trigger);
    await key(trigger, KEYBOARD_KEY.Escape);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside, stays open for a press inside', async () => {
    const { settle, click, trigger, outside, panel } = await setup();
    await click(trigger);
    panel().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Tab past the last switch or Shift+Tab before the slider closes it on the trigger', async () => {
    const { click, trigger, range, switches, key } = await setup();
    await click(trigger, 0);
    const last = switches().at(-1) as HTMLElement;
    last.focus();
    await key(last, KEYBOARD_KEY.Tab);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    await click(trigger, 0);
    await key(range(), KEYBOARD_KEY.Tab, { shiftKey: true });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when focus moves to another element', async () => {
    const { settle, click, trigger, outside, range } = await setup();
    await click(trigger, 0);
    expect(document.activeElement).toBe(range());
    range().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('writes the slider step back to the step model', async () => {
    const { fixture, settle, click, trigger, range } = await setup();
    await click(trigger);
    range().value = '2';
    range().dispatchEvent(new Event('input'));
    await settle();
    expect(fixture.componentInstance.step()).toBe(2);
    expect(range().getAttribute('aria-valuetext')).toBe('2 / 6');
  });

  it('takes the step text as a string or a function of step and count', async () => {
    const { fixture, settle, click, trigger, panel } = await setup();
    fixture.componentInstance.stepText.set('four of six');
    await click(trigger);
    expect(panel().querySelector('.ui-view-menu__step')?.textContent).toBe('four of six');
    fixture.componentInstance.stepText.set((step, steps) => `${step} of ${steps}`);
    await settle();
    expect(panel().querySelector('.ui-view-menu__step')?.textContent).toBe('4 of 6');
  });

  it('turns the slider off with gridDisabled', async () => {
    const { fixture, click, trigger, range } = await setup();
    fixture.componentInstance.list.set(true);
    await click(trigger);
    expect(range().disabled).toBe(true);
  });

  it('emits fieldChange from a switch and from a press on the row', async () => {
    const { fixture, click, trigger, panel, switches } = await setup();
    await click(trigger);
    await click(switches()[1] as HTMLElement);
    expect(fixture.componentInstance.changes()).toEqual([{ id: 'tags', checked: true }]);
    expect(switches()[1]?.getAttribute('aria-checked')).toBe('true');

    // The row is a label around the switch: its text activates the switch.
    const rowText = panel().querySelectorAll<HTMLElement>('.ui-view-menu__row-label')[0];
    rowText?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(fixture.componentInstance.changes().at(-1)).toEqual({ id: 'note', checked: false });
  });

  it('shows the panel in place, always open, with inline', async () => {
    const fixture = TestBed.createComponent(InlineHostComponent);
    fixture.detectChanges();
    TestBed.tick();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.ui-view-menu__panel--shown')).not.toBeNull();
    expect(host.querySelector('.ui-view-menu__surface')).not.toBeNull();
    expect(host.querySelector('.ui-view-menu__separator, [role="separator"]')).toBeNull();
    expect(host.closest('.cdk-overlay-pane')).toBeNull();
    host.querySelector<HTMLElement>('.ui-view-menu__trigger')?.click();
    fixture.detectChanges();
    expect(host.querySelector('.ui-view-menu__surface')).not.toBeNull();
  });

  it('has no axe violations, closed or open', async () => {
    const { click, trigger, root, panel } = await setup();
    expect(await axeViolations(root)).toEqual([]);
    await click(trigger);
    expect(await axeViolations(panel())).toEqual([]);
  });

  it('works through its harness', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const menu = await loader.getHarness(UiViewMenuHarness);
    expect(await menu.getLabel()).toBe('View');
    expect(await menu.isOpen()).toBe(false);
    await menu.open();
    expect(await menu.isOpen()).toBe(true);
    expect(await menu.getStep()).toBe(4);
    expect(await menu.getStepText()).toBe('4 / 6');
    expect(await menu.isGridDisabled()).toBe(false);
    await menu.setStep(5);
    expect(fixture.componentInstance.step()).toBe(5);
    expect(await menu.getFields()).toEqual([
      { label: 'Note', checked: true },
      { label: 'Hashtags', checked: false },
      { label: 'Folder', checked: true },
      { label: 'Date', checked: true },
    ]);
    await menu.toggleField('Hashtags');
    expect(fixture.componentInstance.changes()).toEqual([{ id: 'tags', checked: true }]);
    await expect(menu.toggleField('Nope')).rejects.toThrow('No view menu field named "Nope"');
    await menu.close();
    expect(await menu.isOpen()).toBe(false);
    await menu.close();
  });

  it('draws the reference panel (at least 240px) and a 14px 500 pill with a turning caret', () => {
    const css = compileScss('lib/components/view-menu/view-menu.component.scss');
    expect(css).toContain('min-inline-size: 15rem');
    expect(css).toContain('font-size: 0.875rem');
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('rotate(225deg)');
    expect(css).toContain('var(--surface)');
    expect(css).toContain('var(--shadow-l2)');
    expect(css).toContain('var(--surface-hover)');
  });
});
