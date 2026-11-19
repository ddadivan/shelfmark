import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { DropZoneComponent } from './drop-zone.component';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(DropZoneComponent);
  fixture.componentRef.setInput('actionLabel', 'Choose file');
  fixture.componentRef.setInput('label', 'Drop the file here or');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  const files: File[] = [];
  fixture.componentInstance.fileSelected.subscribe((f) => files.push(f));
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, files, input: host.querySelector('input') as HTMLInputElement };
}

function dragEvent(type: string, types: string[] = ['Files'], files: File[] = []): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types, files, dropEffect: 'none' },
  });
  return event;
}

describe('DropZoneComponent', () => {
  it('renders the label, the action and the hint from inputs', () => {
    const { host, fixture } = setup({ hint: 'HTML export' });
    expect(host.querySelector('.ui-drop-zone__label')?.textContent).toContain('Drop the file');
    expect(host.querySelector('button')?.textContent).toContain('Choose file');
    expect(host.querySelector('.ui-drop-zone__hint')?.textContent).toContain('HTML export');
    fixture.componentRef.setInput('label', '');
    fixture.componentRef.setInput('hint', '');
    fixture.detectChanges();
    expect(host.querySelector('.ui-drop-zone__label')).toBeNull();
    expect(host.querySelector('.ui-drop-zone__hint')).toBeNull();
  });

  it('passes accept to the input and opens it from the button', () => {
    const { host, input } = setup({ accept: '.html' });
    expect(input.getAttribute('accept')).toBe('.html');
    let clicks = 0;
    input.addEventListener('click', (e) => {
      e.preventDefault();
      clicks += 1;
    });
    host.querySelector('button')?.click();
    expect(clicks).toBe(1);
  });

  it('emits the first picked file and resets the input', () => {
    const { input, files } = setup();
    const a = new File(['a'], 'a.html');
    const b = new File(['b'], 'b.html');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [a, b],
    });
    input.dispatchEvent(new Event('change'));
    expect(files).toEqual([a]);
    expect(input.value).toBe('');
    // An empty pick emits nothing.
    Object.defineProperty(input, 'files', { configurable: true, value: [] });
    input.dispatchEvent(new Event('change'));
    expect(files).toHaveLength(1);
  });

  it('highlights while a file is dragged over, with a counter for children', () => {
    const { host, fixture } = setup();
    const over = () => host.classList.contains('ui-drop-zone--over');
    host.dispatchEvent(dragEvent('dragenter'));
    host.dispatchEvent(dragEvent('dragenter'));
    fixture.detectChanges();
    expect(over()).toBe(true);
    host.dispatchEvent(dragEvent('dragleave'));
    fixture.detectChanges();
    expect(over()).toBe(true);
    host.dispatchEvent(dragEvent('dragleave'));
    fixture.detectChanges();
    expect(over()).toBe(false);
  });

  it('prevents default only for file drags and sets the copy effect', () => {
    const { host } = setup();
    const file = dragEvent('dragover');
    host.dispatchEvent(file);
    expect(file.defaultPrevented).toBe(true);
    expect(file.dataTransfer?.dropEffect).toBe('copy');
    const text = dragEvent('dragover', ['text/plain']);
    host.dispatchEvent(text);
    expect(text.defaultPrevented).toBe(false);
    for (const type of ['dragenter', 'dragleave', 'drop']) {
      const e = dragEvent(type, ['text/plain']);
      host.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
    }
  });

  it('emits the first dropped file and clears the highlight', () => {
    const { host, fixture, files } = setup();
    const a = new File(['a'], 'a.html');
    const b = new File(['b'], 'b.html');
    host.dispatchEvent(dragEvent('dragenter'));
    const drop = dragEvent('drop', ['Files'], [a, b]);
    host.dispatchEvent(drop);
    fixture.detectChanges();
    expect(drop.defaultPrevented).toBe(true);
    expect(files).toEqual([a]);
    expect(host.classList.contains('ui-drop-zone--over')).toBe(false);
    host.dispatchEvent(dragEvent('drop', ['Files'], []));
    expect(files).toHaveLength(1);
  });

  it('ignores drags, drops and picks while disabled', () => {
    const { host, fixture, files, input } = setup({ disabled: true });
    const a = new File(['a'], 'a.html');
    const enter = dragEvent('dragenter');
    host.dispatchEvent(enter);
    host.dispatchEvent(dragEvent('drop', ['Files'], [a]));
    fixture.detectChanges();
    expect(enter.defaultPrevented).toBe(false);
    expect(files).toHaveLength(0);
    expect(host.classList.contains('ui-drop-zone--disabled')).toBe(true);
    expect(host.classList.contains('ui-drop-zone--over')).toBe(false);
    expect(input.disabled).toBe(true);
    expect(host.querySelector('button')?.disabled).toBe(true);
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [a],
    });
    input.dispatchEvent(new Event('change'));
    expect(files).toHaveLength(0);
  });

  it('shows the dragging look while the feature says a file is over a larger area', () => {
    const { fixture, host } = setup();
    expect(host.classList.contains('ui-drop-zone--over')).toBe(false);
    fixture.componentRef.setInput('over', true);
    fixture.detectChanges();
    expect(host.classList.contains('ui-drop-zone--over')).toBe(true);
    fixture.componentRef.setInput('over', false);
    fixture.detectChanges();
    expect(host.classList.contains('ui-drop-zone--over')).toBe(false);
  });

  it('marks an invalid zone', () => {
    const { host } = setup({ invalid: true });
    expect(host.classList.contains('ui-drop-zone--invalid')).toBe(true);
  });

  it('has no axe violations', async () => {
    for (const inputs of [{}, { hint: 'HTML export' }, { disabled: true }, { invalid: true }]) {
      const { host } = setup(inputs);
      expect(await axeViolations(host)).toEqual([]);
    }
  });

  describe('stacked layout (illustration)', () => {
    const stacked = {
      illustration: 'welcome-save',
      heading: 'Browser bookmarks',
      text: 'HTML file from Chrome, Safari, Firefox or Edge.',
      hint: '.html, up to 10 MB',
      label: 'or drag the file here',
    };

    it('keeps the row layout without an illustration', () => {
      const { host } = setup();
      expect(host.classList.contains('ui-drop-zone--stacked')).toBe(false);
      expect(host.querySelector('.ui-drop-zone__icon')).not.toBeNull();
      expect(host.querySelector('ui-illustration')).toBeNull();
      expect(host.querySelector('button')?.className).toContain('ui-button--sm');
    });

    it('stacks the scene, heading, text, hint, md button and label in that order', () => {
      const { host } = setup(stacked);
      expect(host.classList.contains('ui-drop-zone--stacked')).toBe(true);
      expect(host.querySelector('.ui-drop-zone__icon')).toBeNull();
      const scene = host.querySelector('ui-illustration');
      expect(scene?.classList.contains('ui-illustration--once')).toBe(true);
      const order = [
        '.ui-drop-zone__stage',
        'h3.ui-drop-zone__heading',
        '.ui-drop-zone__text',
        '.ui-drop-zone__hint',
        'button',
        '.ui-drop-zone__label',
      ].map((selector) => host.querySelector(selector));
      expect(order.every(Boolean)).toBe(true);
      for (let i = 1; i < order.length; i++) {
        const before = order[i - 1] as Element;
        const after = order[i] as Element;
        expect(
          before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
      expect(host.querySelector('h3')?.textContent).toContain('Browser bookmarks');
      const button = host.querySelector('button') as HTMLButtonElement;
      expect(button.className).not.toContain('ui-button--sm');
      expect(button.className).toContain('ui-button--secondary');
    });

    it('leaves out empty copy', () => {
      const { host } = setup({ illustration: 'welcome-save', label: '' });
      expect(host.querySelector('.ui-drop-zone__copy')).toBeNull();
      expect(host.querySelector('.ui-drop-zone__label')).toBeNull();
    });

    it('still takes drops, opens the picker and shows the over, invalid and disabled looks', () => {
      const { fixture, host, files, input } = setup(stacked);
      let clicks = 0;
      input.addEventListener('click', (e) => {
        e.preventDefault();
        clicks += 1;
      });
      host.querySelector('button')?.click();
      expect(clicks).toBe(1);
      const file = new File(['<a>'], 'bookmarks.html', { type: 'text/html' });
      host.dispatchEvent(dragEvent('dragenter'));
      fixture.detectChanges();
      expect(host.classList.contains('ui-drop-zone--over')).toBe(true);
      host.dispatchEvent(dragEvent('drop', ['Files'], [file]));
      fixture.detectChanges();
      expect(files).toEqual([file]);
      expect(host.classList.contains('ui-drop-zone--over')).toBe(false);
      fixture.componentRef.setInput('invalid', true);
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(host.classList.contains('ui-drop-zone--invalid')).toBe(true);
      expect(host.classList.contains('ui-drop-zone--disabled')).toBe(true);
      expect((host.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });

    it('has no axe violations at rest, over, invalid and disabled', async () => {
      for (const extra of [{}, { over: true }, { invalid: true }, { disabled: true }]) {
        const { host } = setup({ ...stacked, ...extra });
        expect(await axeViolations(host)).toEqual([]);
      }
    });

    it('puts the 160px scene on the illustration disc', () => {
      const css = compileScss('lib/components/drop-zone/drop-zone.component.scss');
      expect(css).toContain('var(--illustration-disc)');
      expect(css).toMatch(/--ui-illustration-width:\s*10rem/);
    });
  });

  it('uses tokens only and drops transitions under reduced motion', () => {
    const css = compileScss('lib/components/drop-zone/drop-zone.component.scss');
    expect(css).toContain('var(--accent-bg)');
    expect(css).toContain('var(--border-control)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition: none/);
  });
});
