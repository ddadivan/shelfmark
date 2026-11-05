import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { IconComponent } from './icon.component';
import { ICON_SPRITE_URL } from './icon-sprite-url.const';
import type { IconName } from './models/icon-name.type';
import type { IconSize } from './models/icon-size.type';

interface IconInputs {
  name: IconName;
  size?: IconSize;
  label?: string;
}

function render(inputs: IconInputs) {
  const fixture = TestBed.createComponent(IconComponent);
  fixture.componentRef.setInput('name', inputs.name);
  if (inputs.size !== undefined) {
    fixture.componentRef.setInput('size', inputs.size);
  }
  if (inputs.label !== undefined) {
    fixture.componentRef.setInput('label', inputs.label);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('IconComponent', () => {
  it('references the sprite symbol and fills with currentColor', () => {
    const host = render({ name: 'search' });
    const svg = host.querySelector('svg');

    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(svg?.getAttribute('stroke')).toBeNull();
    expect(host.querySelector('use')?.getAttribute('href')).toBe(
      'assets/ui/icons/sprite.svg#sm-search',
    );
  });

  it('is decorative without a label', () => {
    const host = render({ name: 'add' });

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('role')).toBeNull();
    expect(host.getAttribute('aria-label')).toBeNull();
  });

  it('is an image with an accessible name when labelled', () => {
    const host = render({ name: 'add', label: 'Add link' });

    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Add link');
    expect(host.getAttribute('aria-hidden')).toBeNull();
  });

  it.each([
    [16, 'ui-icon--16'],
    [20, 'ui-icon--20'],
    [24, 'ui-icon--24'],
  ] as const)('applies the size class for %ipx', (size, cssClass) => {
    const host = render({ name: 'tag', size });

    expect(host.classList.contains(cssClass)).toBe(true);
  });

  it('defaults to 16px', () => {
    expect(render({ name: 'tag' }).classList.contains('ui-icon--16')).toBe(true);
  });

  it('uses the injected sprite URL', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ICON_SPRITE_URL, useValue: '/cdn/sprite.svg' }],
    });
    const host = render({ name: 'user' });

    expect(host.querySelector('use')?.getAttribute('href')).toBe('/cdn/sprite.svg#sm-user');
  });

  it('has no axe violations (decorative and labelled)', async () => {
    const decorative = render({ name: 'close' });
    const labelled = render({ name: 'close', label: 'Close' });
    document.body.append(decorative, labelled);

    expect(await axeViolations(decorative)).toEqual([]);
    expect(await axeViolations(labelled)).toEqual([]);

    decorative.remove();
    labelled.remove();
  });
});
