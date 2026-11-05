import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { RippleDirective } from './ripple.directive';

@Component({
  imports: [RippleDirective],
  template: `
    <div class="row" [uiRipple]="ripple()" [attr.aria-disabled]="ariaDisabled()">Row</div>
    @if (link()) {
      <a class="lnk" href="#x" uiRipple>Link</a>
    }
    <button class="btn" uiRipple [disabled]="disabled()">Press</button>
  `,
})
class HostComponent {
  readonly ripple = signal<boolean | string>(true);
  readonly disabled = signal(false);
  readonly link = signal(false);
  readonly ariaDisabled = signal<string | null>(null);
}

function pointer(type: string, x: number, y: number, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    button: 0,
    isPrimary: true,
    ...init,
  });
}

function key(type: string, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, key: k, ...init });
}

async function setup(reducedMotion = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const row = root.querySelector('.row') as HTMLElement;
  const btn = root.querySelector('.btn') as HTMLButtonElement;
  row.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
  btn.getBoundingClientRect = () => new DOMRect(0, 0, 100, 36);
  const spans = (el: HTMLElement) => el.querySelectorAll<HTMLElement>(':scope > .ui-ripple');
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, root, row, btn, spans, settle };
}

function animationEnd(el: HTMLElement, name: string): void {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: name });
  el.dispatchEvent(event);
}

describe('RippleDirective', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('marks the host and starts a sized, positioned, aria-hidden circle on pointerdown', async () => {
    const { row, spans } = await setup();

    expect(row.classList.contains('ui-ripple-host')).toBe(true);

    row.dispatchEvent(pointer('pointerdown', 60, 30));
    const [span] = spans(row);

    // Touch at (50, 10) inside a 200x40 host: farthest corner is (200, 40) -> sqrt(150^2 + 30^2).
    const radius = Math.hypot(150, 30);
    expect(spans(row)).toHaveLength(1);
    expect(span.getAttribute('aria-hidden')).toBe('true');
    expect(span.style.getPropertyValue('width')).toBe(`${radius * 2}px`);
    expect(span.style.getPropertyValue('left')).toBe(`${50 - radius}px`);
    expect(span.style.getPropertyValue('top')).toBe(`${10 - radius}px`);
    expect(span.classList.contains('is-out')).toBe(false);
  });

  it('fades on release and removes the span when the fade ends', async () => {
    const { row, spans } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    const [span] = spans(row);

    row.dispatchEvent(pointer('pointerup', 60, 30));

    expect(span.classList.contains('is-out')).toBe(true);

    animationEnd(span, 'ui-ripple-grow');

    expect(spans(row)).toHaveLength(1);

    animationEnd(span, 'ui-ripple-fade');

    expect(spans(row)).toHaveLength(0);
  });

  it.each(['pointercancel', 'pointerleave'])('releases on %s', async (type) => {
    const { row, spans } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    row.dispatchEvent(pointer(type, 60, 30));

    expect(spans(row)[0].classList.contains('is-out')).toBe(true);
  });

  it('cancels when the pointer moves more than 10px and keeps it for small moves', async () => {
    const { row, spans } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    row.dispatchEvent(pointer('pointermove', 65, 34));

    expect(spans(row)[0].classList.contains('is-out')).toBe(false);

    row.dispatchEvent(pointer('pointermove', 60, 45));

    expect(spans(row)[0].classList.contains('is-out')).toBe(true);
  });

  it('ignores moves without a ripple, secondary buttons and non-primary pointers', async () => {
    const { row, spans } = await setup();
    row.dispatchEvent(pointer('pointermove', 500, 500));
    row.dispatchEvent(pointer('pointerdown', 60, 30, { button: 2 }));
    row.dispatchEvent(pointer('pointerdown', 60, 30, { isPrimary: false }));

    expect(spans(row)).toHaveLength(0);
  });

  it.each(['Enter', ' '])('starts from the centre on %j and fades on keyup', async (k) => {
    const { row, spans } = await setup();
    row.dispatchEvent(key('keydown', k));
    const [span] = spans(row);

    // Centre of a 200x40 host is (100, 20); farthest corner is 100 x 20 away.
    const radius = Math.hypot(100, 20);
    expect(span.style.getPropertyValue('left')).toBe(`${100 - radius}px`);
    expect(span.style.getPropertyValue('top')).toBe(`${20 - radius}px`);

    row.dispatchEvent(key('keydown', k, { repeat: true }));

    expect(spans(row)).toHaveLength(1);

    row.dispatchEvent(key('keyup', k));

    expect(span.classList.contains('is-out')).toBe(true);
  });

  it('ignores other keys and releases a key ripple on blur', async () => {
    const { row, spans } = await setup();
    row.dispatchEvent(key('keydown', 'a'));
    row.dispatchEvent(key('keyup', 'a'));

    expect(spans(row)).toHaveLength(0);

    row.dispatchEvent(key('keydown', 'Enter'));
    row.dispatchEvent(key('keyup', 'a'));

    expect(spans(row)[0].classList.contains('is-out')).toBe(false);

    row.dispatchEvent(new FocusEvent('blur'));

    expect(spans(row)[0].classList.contains('is-out')).toBe(true);
  });

  it('does nothing on a disabled button or an aria-disabled host', async () => {
    const { host, btn, row, spans, settle } = await setup();
    host.disabled.set(true);
    host.ariaDisabled.set('true');
    await settle();
    btn.dispatchEvent(pointer('pointerdown', 10, 10));
    row.dispatchEvent(pointer('pointerdown', 60, 30));

    expect(spans(btn)).toHaveLength(0);
    expect(spans(row)).toHaveLength(0);
  });

  it('opts out with [uiRipple]="false" and drops the host class', async () => {
    const { host, row, spans, settle } = await setup();
    host.ripple.set(false);
    await settle();
    row.dispatchEvent(pointer('pointerdown', 60, 30));

    expect(row.classList.contains('ui-ripple-host')).toBe(false);
    expect(spans(row)).toHaveLength(0);

    host.ripple.set('false');
    await settle();

    expect(row.classList.contains('ui-ripple-host')).toBe(false);

    host.ripple.set('');
    await settle();

    expect(row.classList.contains('ui-ripple-host')).toBe(true);
  });

  it('ends running ripples when the host opts out or becomes disabled', async () => {
    const { host, row, spans, settle } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    row.dispatchEvent(key('keydown', 'Enter'));

    expect(spans(row)).toHaveLength(2);

    host.ripple.set(false);
    await settle();

    expect(spans(row)).toHaveLength(0);
  });

  it('gives a link no Space ripple but keeps Enter', async () => {
    const { host, root, settle } = await setup();
    host.link.set(true);
    await settle();
    const anchor = root.querySelector('a') as HTMLElement;
    anchor.getBoundingClientRect = () => new DOMRect(0, 0, 100, 36);
    anchor.dispatchEvent(key('keydown', ' '));

    expect(anchor.querySelectorAll('.ui-ripple')).toHaveLength(0);

    anchor.dispatchEvent(key('keydown', 'Enter'));

    expect(anchor.querySelectorAll('.ui-ripple')).toHaveLength(1);
  });

  it('removes the span at once when reduced motion is on at release', async () => {
    const { row, spans } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
    }));
    row.dispatchEvent(pointer('pointerup', 60, 30));

    expect(spans(row)).toHaveLength(0);
  });

  it('shows no ripple under prefers-reduced-motion', async () => {
    const { row, spans } = await setup(true);
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    row.dispatchEvent(key('keydown', 'Enter'));

    expect(spans(row)).toHaveLength(0);
  });

  it('removes running ripples on destroy', async () => {
    const { fixture, row, spans } = await setup();
    row.dispatchEvent(pointer('pointerdown', 60, 30));
    const [span] = spans(row);
    fixture.destroy();

    expect(span.isConnected).toBe(false);
  });

  it('has no axe violations', async () => {
    const { root, row } = await setup();
    document.body.append(root);
    row.dispatchEvent(pointer('pointerdown', 60, 30));

    expect(await axeViolations(root)).toEqual([]);
    root.remove();
  });
});
