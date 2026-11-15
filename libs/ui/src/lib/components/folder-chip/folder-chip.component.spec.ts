import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { FolderChipComponent } from './folder-chip.component';

function setup(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(FolderChipComponent);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('FolderChipComponent', () => {
  it('shows the glyph and the name with a hidden hint, tinted by the colour', async () => {
    const chip = setup({ label: 'Recipes', icon: 'utensils', colour: 'clay', hint: 'In folder' });
    expect(chip.querySelector('ui-icon')).not.toBeNull();
    expect(chip.textContent?.replace(/\s+/g, ' ').trim()).toBe('In folder Recipes');
    expect(chip.querySelector('.ui-folder-chip__hint')?.textContent?.trim()).toBe('In folder');
    expect(chip.getAttribute('title')).toBe('Recipes');
    expect(chip.style.getPropertyValue('--ui-folder-tint')).toBe('var(--folder-clay-bg)');
    expect(await axeViolations(chip)).toEqual([]);
  });

  it('draws an emoji instead of the glyph and stays graphite without a colour', () => {
    const chip = setup({ label: 'Trips', icon: '✈️' });
    expect(chip.querySelector('ui-icon')).toBeNull();
    expect(chip.querySelector('.ui-folder-chip__emoji')?.textContent).toBe('✈️');
    expect(chip.hasAttribute('data-ui-folder-colour')).toBe(false);
    expect(chip.querySelector('.ui-folder-chip__hint')).toBeNull();
  });
});
