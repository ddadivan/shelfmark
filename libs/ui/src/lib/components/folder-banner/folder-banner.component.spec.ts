import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { FolderBannerComponent } from './folder-banner.component';

@Component({
  imports: [FolderBannerComponent],
  template: `<ui-folder-banner [colour]="colour()" [image]="image()"
    ><h1>Recipes</h1></ui-folder-banner
  >`,
})
class HostComponent {
  readonly colour = signal('sage');
  readonly image = signal<string | null>(null);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const banner = root.querySelector('ui-folder-banner') as HTMLElement;
  const update = (change: () => void): void => {
    change();
    fixture.detectChanges();
  };
  return { fixture, root, banner, update, host: fixture.componentInstance };
}

describe('FolderBannerComponent', () => {
  it('projects the content and tints a chosen colour only', () => {
    const { banner, update, host } = setup();
    expect(banner.querySelector('h1')?.textContent).toBe('Recipes');
    expect(banner.hasAttribute('data-ui-folder-colour')).toBe(true);
    expect(banner.style.getPropertyValue('--ui-folder-tint')).toBe('var(--folder-sage-bg)');
    update(() => host.colour.set('graphite'));
    expect(banner.hasAttribute('data-ui-folder-colour')).toBe(false);
  });

  it('shows a decorative cover with a scrim, and the band again when it fails', () => {
    const { banner, update, host } = setup();
    update(() => host.image.set('/api/links/a/image?v=1'));
    const img = banner.querySelector<HTMLImageElement>('.ui-folder-banner__cover');
    expect(img?.getAttribute('src')).toBe('/api/links/a/image?v=1');
    expect(img?.getAttribute('alt')).toBe('');
    expect(banner.querySelector('.ui-folder-banner__scrim')).not.toBeNull();
    expect(banner.classList).toContain('ui-folder-banner--cover');

    img?.dispatchEvent(new Event('error'));
    update(() => undefined);
    expect(banner.querySelector('.ui-folder-banner__cover')).toBeNull();
    expect(banner.classList).not.toContain('ui-folder-banner--cover');

    update(() => host.image.set('/api/links/b/image?v=1'));
    expect(banner.querySelector('.ui-folder-banner__cover')).not.toBeNull();
  });

  it('has no axe violations with a cover', async () => {
    const { root, update, host } = setup();
    update(() => host.image.set('/api/links/a/image?v=1'));
    expect(await axeViolations(root)).toEqual([]);
  });

  it('fades the band into the page and keeps the cover scrim opaque behind the text', () => {
    const css = compileScss('lib/components/folder-banner/folder-banner.component.scss');
    expect(css).toMatch(/linear-gradient\(\s*160deg/);
    expect(css).toContain('var(--ui-folder-banner-ground) 55%');
  });
});
