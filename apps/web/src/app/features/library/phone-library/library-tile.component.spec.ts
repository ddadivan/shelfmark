import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibraryTileComponent } from './library-tile.component';

function setup(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(LibraryTileComponent);
  fixture.componentRef.setInput('href', '/favorites');
  fixture.componentRef.setInput('icon', 'star');
  fixture.componentRef.setInput('label', 'Favorites');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('LibraryTileComponent', () => {
  it('is one link to the route with the name and the count line', () => {
    const { element } = setup({ meta: '12' });
    const link = element.querySelector('a');

    expect(link?.getAttribute('href')).toBe('/favorites');
    expect(link?.textContent).toContain('Favorites');
    expect(link?.textContent).toContain('12');
    expect(link?.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('keeps an empty count line while there is no count, so the tile keeps its height', () => {
    const { element } = setup({});

    expect(element.querySelector('.library-tile__meta')?.textContent?.trim()).toBe('');
  });

  it('emits instead of navigating on a plain click when it opens a popup', () => {
    const { fixture, element } = setup({ popup: true });
    const activated = vi.fn();
    fixture.componentInstance.activated.subscribe(activated);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    element.querySelector('a')?.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(activated).toHaveBeenCalledTimes(1);
    expect(element.querySelector('a')?.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('leaves a modified click to the browser', () => {
    const { fixture, element } = setup({ popup: true });
    const activated = vi.fn();
    fixture.componentInstance.activated.subscribe(activated);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

    element.querySelector('a')?.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(activated).not.toHaveBeenCalled();
  });
});
