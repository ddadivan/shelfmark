import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LOGO_VARIANT, LogoComponent } from '@shelfmark/ui';
import { BrowserExtensionService } from '../../../../core/browser-extension/browser-extension.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { extensionPopupSrc } from '../../../library/components/extension-banner/extension-popup-src';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';

/**
 * "Save the page you are on" (#455, Landing mockup): a mention of the browser extension with the
 * real popup screenshot, no link (author: the install link is for signed-in people, in the app).
 * Only on a desktop Chrome, Edge, Brave or Arc (`BrowserExtensionService.fits`, rendered with
 * `@if`). Deferred below the fold like the other sections, so the first paint does not change.
 */
@Component({
  selector: 'app-landing-extension',
  imports: [LandingRevealDirective, LogoComponent, NgOptimizedImage, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-extension.component.html',
  styleUrl: './landing-extension.component.scss',
})
export class LandingExtensionComponent {
  protected readonly extension = inject(BrowserExtensionService);
  private readonly theme = inject(ThemeService);
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
  protected readonly popupSrc = computed(() => extensionPopupSrc(this.theme.resolved()));
}
